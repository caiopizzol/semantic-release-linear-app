import fetch from 'node-fetch';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface AssociatedPR {
  number: number;
  headRefName: string;
}

interface CommitNode {
  oid: string;
  associatedPullRequests: {
    nodes: AssociatedPR[];
  };
}

/**
 * GitHub API client for GraphQL operations
 */
export class GitHubClient {
  private token: string;
  private apiUrl: string;

  constructor(token: string, apiUrl = 'https://api.github.com') {
    this.token = token;
    this.apiUrl = apiUrl;
  }

  /**
   * Execute a GraphQL query
   */
  private async query<T = unknown>(query: string): Promise<T> {
    const graphqlUrl = `${this.apiUrl}/graphql`;
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = (await response.json()) as GraphQLResponse<T>;

    if (data.errors) {
      throw new Error(`GitHub API error: ${data.errors[0].message}`);
    }

    if (!data.data) {
      throw new Error('No data returned from GitHub API');
    }

    return data.data;
  }

  /**
   * Get source branch names for commits via associated PRs
   */
  async getAssociatedPRBranches(
    owner: string,
    repo: string,
    commitShas: string[],
  ): Promise<string[]> {
    if (commitShas.length === 0) return [];

    // Build query for all commits
    const commitQueries = commitShas
      .map(
        (sha, i) => `
        commit${i}: object(oid: "${sha}") {
          ... on Commit {
            oid
            associatedPullRequests(first: 10) {
              nodes {
                number
                headRefName
              }
            }
          }
        }
      `,
      )
      .join('\n');

    const query = `
      query GetAssociatedPRs {
        repository(owner: "${owner}", name: "${repo}") {
          ${commitQueries}
        }
      }
    `;

    const data = await this.query<{
      repository: Record<string, CommitNode | null>;
    }>(query);

    // Extract unique branch names
    const branches = new Set<string>();
    for (const key of Object.keys(data.repository)) {
      const commit = data.repository[key];
      if (commit?.associatedPullRequests?.nodes) {
        for (const pr of commit.associatedPullRequests.nodes) {
          if (pr.headRefName) {
            branches.add(pr.headRefName);
          }
        }
      }
    }

    return Array.from(branches);
  }
}

/**
 * Parse GitHub owner/repo from repository URL
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;

  // Handle various GitHub URL formats:
  // https://github.com/owner/repo.git
  // https://github.com/owner/repo
  // git@github.com:owner/repo.git
  // git+https://github.com/owner/repo.git
  const patterns = [
    /github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/,
    /github\.com[/:]([^/]+)\/([^/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }

  return null;
}
