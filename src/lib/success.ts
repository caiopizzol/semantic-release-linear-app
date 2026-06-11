import { SuccessContext } from 'semantic-release';
import { LinearClient } from './linear-client.js';
import { GitHubClient, parseGitHubUrl, PRSources } from './github-client.js';
import { parseIssuesFromBranch, parseIssuesFromTitle } from './parse-issues.js';
import { PluginConfig, ReleaseType } from '../types.js';
import { getLinearContext } from './context.js';

/**
 * Find source strings (branch names and PR titles) via GitHub API using associated PRs
 */
async function findSourceStrings(
  commits: readonly { hash: string }[],
  githubToken: string,
  githubApiUrl: string,
  repositoryUrl: string | undefined,
  logger: SuccessContext['logger'],
): Promise<PRSources> {
  const branches = new Set<string>();
  const titles = new Set<string>();

  if (commits.length === 0) return { branches: [], titles: [] };

  const parsed = parseGitHubUrl(repositoryUrl || '');
  if (!parsed) {
    logger.log('Could not parse GitHub repository URL, skipping PR lookup');
    return { branches: [], titles: [] };
  }

  const client = new GitHubClient(githubToken, githubApiUrl);
  const commitShas = commits.map((c) => c.hash);

  try {
    const sources = await client.getAssociatedPRSources(parsed.owner, parsed.repo, commitShas);
    sources.branches.forEach((b) => branches.add(b));
    sources.titles.forEach((t) => titles.add(t));

    if (branches.size > 0) {
      logger.log(`Found source branches via GitHub API: ${Array.from(branches).join(', ')}`);
    }
    if (titles.size > 0) {
      logger.log(`Found PR titles via GitHub API: ${Array.from(titles).join(', ')}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.log(`GitHub API error: ${message}`);
  }

  return { branches: Array.from(branches), titles: Array.from(titles) };
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

  const {
    removeOldLabels = true,
    addComment = false,
    dryRun = false,
    commentTemplate,
  } = pluginConfig;

  // Check for GitHub token
  if (!linear.githubToken) {
    logger.log('No GITHUB_TOKEN found, skipping Linear updates');
    return;
  }

  // Find all branches and PR titles that contributed to this release via GitHub API
  const repositoryUrl = context.options?.repositoryUrl;
  const { branches: sourceBranches, titles: sourceTitles } = await findSourceStrings(
    commits,
    linear.githubToken,
    linear.githubApiUrl,
    repositoryUrl,
    logger,
  );

  if (sourceBranches.length === 0 && sourceTitles.length === 0) {
    logger.log('No source branches or PR titles found, skipping Linear updates');
    return;
  }

  // Extract Linear issue IDs from all found branches and PR titles, then merge
  const issueIds = new Set<string>();
  for (const branchName of sourceBranches) {
    const branchIssues = parseIssuesFromBranch(branchName, linear.teamKeys);
    branchIssues.forEach((id) => issueIds.add(id));
  }
  for (const title of sourceTitles) {
    const titleIssues = parseIssuesFromTitle(title, linear.teamKeys);
    titleIssues.forEach((id) => issueIds.add(id));
  }

  if (issueIds.size === 0) {
    logger.log(
      `No Linear issues found in branches: ${sourceBranches.join(', ')} ` +
        `or PR titles: ${sourceTitles.join(', ')}`,
    );
    return;
  }

  logger.log(
    `Found ${issueIds.size} Linear issue(s): ${Array.from(issueIds).join(', ')} ` +
      `from ${sourceBranches.length} branch(es) and ${sourceTitles.length} PR title(s)`,
  );

  const version = nextRelease.version;
  const channel = nextRelease.channel;
  const packagePrefix = linear.packageName ? `${linear.packageName}-` : '';
  const labelName = `${packagePrefix}${linear.labelPrefix}${version}`;

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
          const labelPrefixWithPackage = `${packagePrefix}${linear.labelPrefix}`;
          await client.removeVersionLabels(issue.id, labelPrefixWithPackage);
        }

        // Add the new version label
        await client.addLabelToIssue(issue.id, label.id);

        // Add comment if configured
        if (addComment) {
          const comment = formatComment(
            commentTemplate,
            version,
            channel,
            linear.packageName,
            nextRelease.gitTag,
            repositoryUrl,
          );
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

/**
 * Format comment with template placeholders
 */
function formatComment(
  template: string | undefined,
  version: string,
  channel: string | undefined,
  packageName: string | null,
  gitTag: string,
  repositoryUrl: string | undefined,
): string {
  // Raw values - no built-in spacing, template controls layout
  const channelText = channel ? `(${channel} channel)` : '';
  const packageText = packageName ? `**${packageName}**` : '';
  const releaseUrl = buildReleaseUrl(repositoryUrl, gitTag);
  const releaseLink = releaseUrl ? `[${version}](${releaseUrl})` : version;

  // Default template with explicit spacing
  const defaultTemplate = 'Released in {package} v{releaseLink} {channel}';
  const tpl = template || defaultTemplate;

  const result = tpl
    .replace(/{version}/g, version)
    .replace(/{channel}/g, channelText)
    .replace(/{package}/g, packageText)
    .replace(/{packageName}/g, packageName || '')
    .replace(/{releaseUrl}/g, releaseUrl || '')
    .replace(/{releaseLink}/g, releaseLink)
    .replace(/{gitTag}/g, gitTag);

  // Normalize whitespace: collapse multiple spaces, trim
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Build GitHub release URL from repository URL and git tag
 */
function buildReleaseUrl(repositoryUrl: string | undefined, gitTag: string): string | null {
  if (!repositoryUrl || !gitTag) return null;

  // Parse GitHub URL (supports various formats)
  const match = repositoryUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return null;

  const [, owner, repo] = match;
  return `https://github.com/${owner}/${repo}/releases/tag/${gitTag}`;
}
