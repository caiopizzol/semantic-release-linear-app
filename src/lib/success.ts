import { SuccessContext } from "semantic-release";
import { LinearClient } from "./linear-client";
import { parseIssuesFromBranch, shouldProcessBranch } from "./parse-issues";
import {
  PluginConfig,
  LinearContext,
  IssueUpdateResult,
  ReleaseType,
} from "../types";

interface ExtendedContext extends SuccessContext {
  linear?: LinearContext;
  branch: {
    name: string;
    [key: string]: unknown;
  };
}

/**
 * Update Linear issues after a successful release
 * Only uses branch name for issue detection - single source of truth
 */
export async function success(
  pluginConfig: PluginConfig,
  context: ExtendedContext,
): Promise<void> {
  const { logger, nextRelease, linear, branch } = context;

  if (!linear) {
    logger.log("Linear context not found, skipping issue updates");
    return;
  }

  if (!branch.name) {
    logger.log("No branch name available, skipping Linear updates");
    return;
  }

  const {
    removeOldLabels = true,
    addComment = false,
    dryRun = false,
    skipBranches = ["main", "master", "develop", "staging", "production"],
    requireIssueInBranch = true,
  } = pluginConfig;

  // Check if this branch should be processed
  if (requireIssueInBranch && !shouldProcessBranch(branch.name, skipBranches)) {
    logger.log(
      `Branch "${branch.name}" doesn't contain Linear issues or is in skip list, skipping updates`,
    );
    return;
  }

  const client = new LinearClient(linear.apiKey);
  const version = nextRelease.version;
  const channel = nextRelease.channel || "latest";

  // Format the label based on configuration
  const labelName = `${linear.labelPrefix}${version}`;
  const labelColor = getLabelColor(nextRelease.type as ReleaseType);

  logger.log(
    `Updating Linear issues for release ${version} (${channel}) from branch "${branch.name}"`,
  );

  // Extract issue IDs from branch name ONLY
  const issueIds = parseIssuesFromBranch(branch.name, linear.teamKeys);

  if (issueIds.length === 0) {
    logger.log(`No Linear issues found in branch name "${branch.name}"`);
    if (requireIssueInBranch) {
      logger.warn(
        "⚠️  Consider using branch names like: feature/ENG-123-description",
      );
    }
    return;
  }

  logger.log(
    `Found ${issueIds.length} Linear issue(s) in branch "${branch.name}": ${issueIds.join(", ")}`,
  );

  if (dryRun) {
    logger.log("[Dry run] Would update issues:", issueIds);
    logger.log(`[Dry run] Would apply label: ${labelName}`);
    logger.log(`[Dry run] Branch: ${branch.name}`);
    return;
  }

  // Ensure the version label exists
  const label = await client.ensureLabel(labelName, labelColor);
  logger.log(`✓ Ensured label exists: ${labelName}`);

  // Update each issue
  const results = await Promise.allSettled(
    issueIds.map(async (issueId): Promise<IssueUpdateResult> => {
      try {
        // Get the issue first
        const issue = await client.getIssue(issueId);

        if (!issue) {
          logger.warn(`Issue ${issueId} not found in Linear, skipping`);
          return { issueId, status: "not_found" };
        }

        // Remove old version labels if configured
        if (removeOldLabels) {
          await client.removeVersionLabels(issue.id, linear.labelPrefix);
        }

        // Add the new version label
        await client.addLabelToIssue(issue.id, label.id);

        // Add comment if configured
        if (addComment) {
          const comment = formatComment(
            version,
            channel,
            nextRelease,
            branch.name,
          );
          await client.addComment(issue.id, comment);
        }

        logger.log(`✓ Updated issue ${issueId}`);
        return { issueId, status: "updated" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to update issue ${issueId}: ${message}`);
        return { issueId, status: "failed", error: message };
      }
    }),
  );

  // Log summary
  const updated = results.filter(
    (r) => r.status === "fulfilled" && r.value.status === "updated",
  ).length;

  const failed = results.filter(
    (r) =>
      r.status === "rejected" ||
      (r.status === "fulfilled" && r.value.status === "failed"),
  ).length;

  const notFound = results.filter(
    (r) => r.status === "fulfilled" && r.value.status === "not_found",
  ).length;

  logger.log(
    `Linear update complete: ${updated} updated, ${failed} failed, ${notFound} not found`,
  );
}

/**
 * Get label color based on release type
 */
function getLabelColor(releaseType: ReleaseType): string {
  const colors: Record<ReleaseType, string> = {
    major: "#F44336", // Red for breaking changes
    premajor: "#E91E63", // Pink for pre-major
    minor: "#FF9800", // Orange for new features
    preminor: "#FFC107", // Amber for pre-minor
    patch: "#4CAF50", // Green for fixes
    prepatch: "#8BC34A", // Light green for pre-patch
    prerelease: "#9C27B0", // Purple for prereleases
  };

  return colors[releaseType] || "#4752C4"; // Default blue
}

/**
 * Format comment for Linear issue
 */
function formatComment(
  version: string,
  channel: string,
  release: SuccessContext["nextRelease"],
  branchName: string,
): string {
  const emoji = channel === "latest" ? "🚀" : "🔬";
  const channelText = channel === "latest" ? "stable" : channel;

  let comment = `${emoji} **Released in \`v${version}\`** (${channelText})\n\n`;
  comment += `📌 Released from branch: \`${branchName}\`\n\n`;

  const githubRepo = process.env.GITHUB_REPOSITORY;
  if (release.gitTag && githubRepo) {
    comment += `[View release →](https://github.com/${githubRepo}/releases/tag/${release.gitTag})`;
  }

  return comment;
}
