export interface PluginConfig {
  /** Linear API key (can also use LINEAR_API_KEY env var) */
  apiKey?: string;

  /** Team keys to filter issues (e.g., ["ENG", "FEAT"]) */
  teamKeys?: string[];

  /** Prefix for version labels (default: "v") */
  labelPrefix?: string;

  /** Remove old version labels from issues (default: true) */
  removeOldLabels?: boolean;

  /** Add a comment to issues with release info (default: false) */
  addComment?: boolean;

  /** Preview changes without updating Linear (default: false) */
  dryRun?: boolean;

  /** Branches to skip unless they contain issue IDs (default: ["main", "master", "develop", "staging", "production"]) */
  skipBranches?: string[];

  /** Require issues in branch name to process (default: true) */
  requireIssueInBranch?: boolean;
}

export interface LinearContext {
  apiKey: string;
  teamKeys: string[] | null;
  labelPrefix: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  labels: {
    nodes: LinearLabel[];
  };
}

export interface LinearLabel {
  id: string;
  name: string;
  color?: string;
}

export interface IssueUpdateResult {
  issueId: string;
  status: "updated" | "failed" | "not_found";
  error?: string;
}

export interface LinearViewer {
  id: string;
  name: string;
}

export type ReleaseType =
  | "major"
  | "premajor"
  | "minor"
  | "preminor"
  | "patch"
  | "prepatch"
  | "prerelease";
