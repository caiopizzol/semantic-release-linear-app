import { parseIssuesFromBranch } from './parse-issues';

describe('parse-issues', () => {
  test('extracts Linear issue IDs from branch name', () => {
    const branchName = 'feature/ENG-123-add-new-feature';
    const result = parseIssuesFromBranch(branchName);
    expect(result).toEqual(['ENG-123']);
  });

  test('extracts multiple issue IDs from branch name', () => {
    const branchName = 'fix/ENG-123-FEAT-456-bug-fix';
    const result = parseIssuesFromBranch(branchName);
    expect(result).toEqual(expect.arrayContaining(['ENG-123', 'FEAT-456']));
    expect(result).toHaveLength(2);
  });

  test('filters by team keys when provided', () => {
    const branchName = 'feature/ENG-123-OTHER-456';
    const result = parseIssuesFromBranch(branchName, ['ENG']);
    expect(result).toEqual(['ENG-123']);
  });

  test('returns empty array for branch without issues', () => {
    const branchName = 'feature/no-issues-here';
    const result = parseIssuesFromBranch(branchName);
    expect(result).toEqual([]);
  });
});
