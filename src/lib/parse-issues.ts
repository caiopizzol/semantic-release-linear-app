/**
 * Extract Linear issue IDs from branch name ONLY
 * This enforces a single source of truth for issue tracking
 */

/**
 * Extract Linear issue IDs from a branch name
 * @param branchName - The branch name to parse
 * @param teamKeys - Optional list of team keys to filter by
 * @returns Array of unique issue identifiers
 */
export function parseIssuesFromBranch(
  branchName: string,
  teamKeys: string[] | null = null,
): string[] {
  const issues = new Set<string>();

  // Build regex pattern based on team keys
  const teamPattern = teamKeys ? `(?:${teamKeys.join('|')})` : '[A-Z]+';

  // Pattern matches: feature/ENG-123-description, ENG-123, bugfix/FEAT-45, etc.
  const issuePattern = new RegExp(`\\b(${teamPattern}-\\d+)\\b`, 'gi');

  const matches = Array.from(branchName.matchAll(issuePattern));
  for (const match of matches) {
    issues.add(match[1].toUpperCase());
  }

  return Array.from(issues);
}
