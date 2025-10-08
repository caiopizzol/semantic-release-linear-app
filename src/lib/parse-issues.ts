import { Commit } from "semantic-release";

/**
 * Extract Linear issue IDs from a commit
 * @param commit - The commit object from semantic-release
 * @param teamKeys - Optional list of team keys to filter by
 * @returns Set of unique issue identifiers
 */
export function parseCommit(
  commit: Commit,
  teamKeys: string[] | null = null,
): Set<string> {
  const issues = new Set<string>();

  // Build regex pattern based on team keys
  const teamPattern = teamKeys ? `(?:${teamKeys.join("|")})` : "[A-Z]+";

  // Pattern matches: ENG-123, FEAT-45, etc.
  const issuePattern = new RegExp(`\\b(${teamPattern}-\\d+)\\b`, "gi");

  // Search in commit message
  if (commit.message) {
    const messageMatches = Array.from(commit.message.matchAll(issuePattern));
    for (const match of messageMatches) {
      issues.add(match[1].toUpperCase());
    }
  }

  // Search in commit body
  if (commit.body) {
    const bodyMatches = Array.from(commit.body.matchAll(issuePattern));
    for (const match of bodyMatches) {
      issues.add(match[1].toUpperCase());
    }
  }

  return issues;
}

/**
 * Extract all Linear issue IDs from a list of commits
 * @param commits - Array of commit objects
 * @param teamKeys - Optional list of team keys to filter by
 * @returns Array of unique issue identifiers
 */
export function parseIssues(
  commits: readonly Commit[],
  teamKeys: string[] | null = null,
): string[] {
  const allIssues = new Set<string>();

  commits.forEach((commit) => {
    const commitIssues = parseCommit(commit, teamKeys);
    commitIssues.forEach((issue) => allIssues.add(issue));
  });

  return Array.from(allIssues);
}
