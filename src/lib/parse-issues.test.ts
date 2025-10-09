import { parseIssuesFromBranch, shouldProcessBranch } from "./parse-issues";

describe("parse-issues", () => {
  test("extracts Linear issue IDs from branch name", () => {
    const branchName = "feature/ENG-123-add-new-feature";
    const result = parseIssuesFromBranch(branchName);
    expect(result).toEqual(["ENG-123"]);
  });

  test("extracts multiple issue IDs from branch name", () => {
    const branchName = "fix/ENG-123-FEAT-456-bug-fix";
    const result = parseIssuesFromBranch(branchName);
    expect(result).toEqual(expect.arrayContaining(["ENG-123", "FEAT-456"]));
    expect(result).toHaveLength(2);
  });

  test("filters by team keys when provided", () => {
    const branchName = "feature/ENG-123-OTHER-456";
    const result = parseIssuesFromBranch(branchName, ["ENG"]);
    expect(result).toEqual(["ENG-123"]);
  });

  test("returns empty array for branch without issues", () => {
    const branchName = "feature/no-issues-here";
    const result = parseIssuesFromBranch(branchName);
    expect(result).toEqual([]);
  });

  test("shouldProcessBranch returns false for skip branches without issues", () => {
    expect(shouldProcessBranch("main", ["main", "master"])).toBe(false);
    expect(shouldProcessBranch("master", ["main", "master"])).toBe(false);
  });

  test("shouldProcessBranch returns true for skip branches with issues", () => {
    expect(shouldProcessBranch("main-ENG-123", ["main", "master"])).toBe(true);
  });

  test("shouldProcessBranch returns true for feature branches with issues", () => {
    expect(shouldProcessBranch("feature/ENG-123", ["main", "master"])).toBe(
      true,
    );
  });

  test("shouldProcessBranch returns false for feature branches without issues", () => {
    expect(shouldProcessBranch("feature/no-issues", ["main", "master"])).toBe(
      false,
    );
  });
});
