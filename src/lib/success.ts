import { SuccessContext } from 'semantic-release';
import { execa } from 'execa';
import { LinearClient } from './linear-client.js';
import { parseIssuesFromBranch } from './parse-issues.js';
import { PluginConfig, ReleaseType } from '../types.js';
import { getLinearContext } from './context.js';

/**
 * Find source branches that contain the given commits
 */
async function findSourceBranches(
  commits: readonly { hash: string }[],
  logger: SuccessContext['logger'],
): Promise<Set<string>> {
  const branches = new Set<string>();
  const skipBranches = ['main', 'master', 'develop', 'stable', 'HEAD'];

  if (commits.length === 0) return branches;

  // Check all commits to find all source branches
  for (const commit of commits) {
    try {
      const { stdout } = await execa('git', [
        'branch',
        '-r',
        '--contains',
        commit.hash,
        '--merged',
      ]);

      const branchLines = stdout.split('\n').map((b: string) => b.trim());
      for (const line of branchLines) {
        const match = line.match(/origin\/(.+)/);
        if (match && !skipBranches.includes(match[1])) {
          branches.add(match[1]);
        }
      }
    } catch {
      // Commit might not exist or other git error, continue with next commit
    }
  }

  if (branches.size > 0) {
    logger.log(`Found source branches: ${Array.from(branches).join(', ')}`);
  }

  return branches;
}

/**
 * Update Linear issues after a successful release
 */
export async function success(pluginConfig: PluginConfig, context: SuccessContext): Promise<void> {
  const { logger, nextRelease, commits } = context;
  const linear = getLinearContext();

  if (!linear) {
    logger.log('Linear context not found, skipping issue updates');
    return;
  }

  if (!commits || commits.length === 0) {
    logger.log('No commits found in release, skipping Linear updates');
    return;
  }

  const { removeOldLabels = true, addComment = false, dryRun = false } = pluginConfig;

  // Find all branches that contributed to this release
  const sourceBranches = await findSourceBranches(commits, logger);

  if (sourceBranches.size === 0) {
    logger.log('No source branches found, skipping Linear updates');
    return;
  }

  // Extract Linear issue IDs from all found branches
  const issueIds = new Set<string>();
  for (const branchName of Array.from(sourceBranches)) {
    const branchIssues = parseIssuesFromBranch(branchName, linear.teamKeys);
    branchIssues.forEach((id) => issueIds.add(id));
  }

  if (issueIds.size === 0) {
    logger.log(`No Linear issues found in branches: ${Array.from(sourceBranches).join(', ')}`);
    return;
  }

  logger.log(
    `Found ${issueIds.size} Linear issue(s): ${Array.from(issueIds).join(', ')} ` +
      `from ${sourceBranches.size} branch(es)`,
  );

  const version = nextRelease.version;
  const channel = nextRelease.channel;
  const labelName = `${linear.labelPrefix}${version}`;

  if (dryRun) {
    logger.log('[Dry run] Would update issues:', Array.from(issueIds));
    logger.log(`[Dry run] Would apply label: ${labelName}`);
    return;
  }

  // Initialize Linear client and prepare label
  const client = new LinearClient(linear.apiKey);
  const labelColor = getLabelColor(nextRelease.type as ReleaseType);

  // Ensure the version label exists
  const label = await client.ensureLabel(labelName, labelColor);
  logger.log(`✓ Ensured label exists: ${labelName}`);

  // Update each Linear issue
  const results = await Promise.allSettled(
    Array.from(issueIds).map(async (issueId) => {
      try {
        const issue = await client.getIssue(issueId);
        if (!issue) {
          logger.warn(`Issue ${issueId} not found in Linear`);
          return { issueId, status: 'not_found' };
        }

        // Remove old version labels if configured
        if (removeOldLabels) {
          await client.removeVersionLabels(issue.id, linear.labelPrefix);
        }

        // Add the new version label
        await client.addLabelToIssue(issue.id, label.id);

        // Add comment if configured
        if (addComment) {
          const emoji = channel ? '🔬' : '🚀';
          const channelText = channel ? ` (${channel} channel)` : '';
          const comment = `${emoji} Released in version ${version}${channelText}`;
          await client.addComment(issue.id, comment);
        }

        logger.log(`✓ Updated issue ${issueId}`);
        return { issueId, status: 'updated' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to update issue ${issueId}: ${message}`);
        return { issueId, status: 'failed', error: message };
      }
    }),
  );

  // Log summary
  const updated = results.filter(
    (r) => r.status === 'fulfilled' && r.value?.status === 'updated',
  ).length;
  const failed = results.filter(
    (r) => r.status === 'rejected' || r.value?.status === 'failed',
  ).length;
  const notFound = results.filter(
    (r) => r.status === 'fulfilled' && r.value?.status === 'not_found',
  ).length;

  logger.log(`Linear update complete: ${updated} updated, ${failed} failed, ${notFound} not found`);
}

/**
 * Get label color based on release type
 */
function getLabelColor(releaseType: ReleaseType): string {
  const colors: Record<ReleaseType, string> = {
    major: '#F44336', // Red for breaking changes
    premajor: '#E91E63', // Pink for pre-major
    minor: '#FF9800', // Orange for new features
    preminor: '#FFC107', // Amber for pre-minor
    patch: '#4CAF50', // Green for fixes
    prepatch: '#8BC34A', // Light green for pre-patch
    prerelease: '#9C27B0', // Purple for prereleases
  };

  return colors[releaseType] || '#4752C4'; // Default blue
}
