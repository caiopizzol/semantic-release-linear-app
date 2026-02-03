export interface PluginConfig {
  /** Linear token - API key or OAuth access token (can also use LINEAR_TOKEN env var) */
  token?: string;

  /** Team keys to filter issues (e.g., ["ENG", "FEAT"]) */
  teamKeys?: string[];

  /** Prefix for version labels (default: "v") */
  labelPrefix?: string;

  /** Remove old version labels from issues (default: true) */
  removeOldLabels?: boolean;

  /** Add a comment to issues with release info (default: false) */
  addComment?: boolean;

  /**
   * Custom comment template with placeholders (default: "Released in {package} v{releaseLink} {channel}")
   * Placeholders are raw values - add spaces as needed (multiple spaces are collapsed).
   * Available placeholders:
   * - {version} - Release version (e.g., "1.0.0")
   * - {channel} - Release channel (e.g., "(next channel)" or "")
   * - {package} - Package name bold (e.g., "**cli**" or "")
   * - {packageName} - Raw package name (e.g., "cli" or "")
   * - {releaseUrl} - GitHub release URL
   * - {releaseLink} - Markdown link [version](url)
   * - {gitTag} - Git tag (e.g., "cli-v1.0.0")
   */
  commentTemplate?: string;

  /** Preview changes without updating Linear (default: false) */
  dryRun?: boolean;

  /** Package name for label prefix in monorepos (e.g., "superdoc" creates "superdoc-v1.0.0") */
  packageName?: string;

  /** GitHub token for API access (falls back to GITHUB_TOKEN env var) */
  githubToken?: string;

  /** GitHub API URL for Enterprise (default: https://api.github.com) */
  githubApiUrl?: string;
}

export interface LinearContext {
  apiKey: string;
  teamKeys: string[] | null;
  labelPrefix: string;
  packageName: string | null;
  githubToken: string | null;
  githubApiUrl: string;
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

export interface LinearViewer {
  id: string;
  name: string;
}

export type ReleaseType =
  | 'major'
  | 'premajor'
  | 'minor'
  | 'preminor'
  | 'patch'
  | 'prepatch'
  | 'prerelease';
