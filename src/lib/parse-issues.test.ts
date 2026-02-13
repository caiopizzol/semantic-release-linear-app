import { describe, test, expect } from '@jest/globals';
import { parseIssuesFromBranch } from './parse-issues.js';

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

  test('extracts issue ID when followed by underscore', () => {
    const branchName = 'sd-1681_block-id-crash';
    const result = parseIssuesFromBranch(branchName, ['SD']);
    expect(result).toEqual(['SD-1681']);
  });

  test('returns empty array for branch without issues', () => {
    const branchName = 'feature/no-issues-here';
    const result = parseIssuesFromBranch(branchName);
    expect(result).toEqual([]);
  });
});
