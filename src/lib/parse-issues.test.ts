import { parseIssues } from "./parse-issues";
import { Commit } from "semantic-release";

describe("parse-issues", () => {
  test("extracts Linear issue IDs from commits", () => {
    const commits = [
      { message: "fix: solve ENG-123 and FEAT-456" },
      {
        message: "feat: new feature",
        body: "Closes BUG-789",
      },
      { message: "chore: no issues here" },
    ] as Commit[];

    const result = parseIssues(commits);
    expect(result).toEqual(
      expect.arrayContaining(["ENG-123", "FEAT-456", "BUG-789"]),
    );
    expect(result).toHaveLength(3);
  });

  test("filters by team keys when provided", () => {
    const commits = [{ message: "fix: ENG-123 OTHER-456" }] as Commit[];

    const result = parseIssues(commits, ["ENG"]);
    expect(result).toEqual(["ENG-123"]);
  });
});
