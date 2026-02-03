import fetch from 'node-fetch';
import { LinearIssue, LinearLabel, LinearViewer } from '../types.js';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Linear API client for GraphQL operations
 */
export class LinearClient {
  private apiKey: string;
  private apiUrl: string = 'https://api.linear.app/graphql';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get the Authorization header value.
   * Personal API keys (lin_api_*) are used directly.
   * OAuth tokens need "Bearer " prefix.
   */
  private getAuthHeader(): string {
    // Personal API keys start with "lin_api_"
    if (this.apiKey.startsWith('lin_api_')) {
      return this.apiKey;
    }
    // OAuth tokens need Bearer prefix
    return `Bearer ${this.apiKey}`;
  }

  /**
   * Execute a GraphQL query
   */
  private async query<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = (await response.json()) as GraphQLResponse<T>;

    if (data.errors) {
      throw new Error(`Linear API error: ${data.errors[0].message}`);
    }

    if (!data.data) {
      throw new Error('No data returned from Linear API');
    }

    return data.data;
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<LinearViewer> {
    const query = `
      query TestConnection {
        viewer {
          id
          name
        }
      }
    `;

    const data = await this.query<{ viewer: LinearViewer }>(query);
    return data.viewer;
  }

  /**
   * Find or create a label
   */
  async ensureLabel(name: string, color: string = '#4752C4'): Promise<LinearLabel> {
    // First, try to find existing label
    const searchQuery = `
      query FindLabel($name: String!) {
        issueLabels(filter: { name: { eq: $name } }) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const searchData = await this.query<{
      issueLabels: { nodes: LinearLabel[] };
    }>(searchQuery, { name });

    if (searchData.issueLabels.nodes.length > 0) {
      return searchData.issueLabels.nodes[0];
    }

    // Create new label if it doesn't exist
    const createMutation = `
      mutation CreateLabel($name: String!, $color: String!) {
        issueLabelCreate(input: { name: $name, color: $color }) {
          issueLabel {
            id
            name
          }
        }
      }
    `;

    const createData = await this.query<{
      issueLabelCreate: { issueLabel: LinearLabel };
    }>(createMutation, { name, color });

    return createData.issueLabelCreate.issueLabel;
  }

  /**
   * Get issue by identifier
   */
  async getIssue(identifier: string): Promise<LinearIssue | null> {
    const query = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          labels {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<{ issue: LinearIssue | null }>(query, {
        identifier,
      });
      return data.issue;
    } catch {
      // Issue might not exist, return null
      return null;
    }
  }

  /**
   * Add label to issue (preserves existing labels)
   */
  async addLabelToIssue(issueId: string, labelId: string): Promise<LinearIssue> {
    // Fetch current issue to get existing labels
    const issue = await this.getIssue(issueId);
    const existingLabelIds = issue?.labels.nodes.map((l) => l.id) ?? [];

    // Combine existing labels with new label (avoid duplicates)
    const allLabelIds = [...new Set([...existingLabelIds, labelId])];

    const mutation = `
      mutation AddLabel($issueId: String!, $labelIds: [String!]!) {
        issueUpdate(
          id: $issueId,
          input: { labelIds: $labelIds }
        ) {
          issue {
            id
            identifier
            title
            labels {
              nodes {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.query<{
      issueUpdate: { issue: LinearIssue };
    }>(mutation, { issueId, labelIds: allLabelIds });

    return data.issueUpdate.issue;
  }

  /**
   * Remove old version labels from issue
   */
  async removeVersionLabels(issueId: string, labelPrefix: string): Promise<LinearIssue | null> {
    const issue = await this.getIssue(issueId);
    if (!issue) return null;

    const versionLabels = issue.labels.nodes.filter((label) => label.name.startsWith(labelPrefix));

    if (versionLabels.length === 0) return issue;

    const mutation = `
      mutation RemoveLabel($issueId: String!, $labelId: String!) {
        issueRemoveLabel(id: $issueId, labelId: $labelId) {
          issue {
            id
            identifier
            title
            labels {
              nodes {
                id
                name
              }
            }
          }
        }
      }
    `;

    // Remove each label individually
    let updatedIssue = issue;
    for (const label of versionLabels) {
      const data = await this.query<{
        issueRemoveLabel: { issue: LinearIssue };
      }>(mutation, { issueId, labelId: label.id });
      updatedIssue = data.issueRemoveLabel.issue;
    }

    return updatedIssue;
  }

  /**
   * Add comment to issue
   */
  async addComment(issueId: string, body: string): Promise<{ id: string }> {
    const mutation = `
      mutation AddComment($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          comment {
            id
          }
        }
      }
    `;

    const data = await this.query<{
      commentCreate: { comment: { id: string } };
    }>(mutation, { issueId, body });

    return data.commentCreate.comment;
  }
}
