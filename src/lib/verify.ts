import SemanticReleaseError from '@semantic-release/error';
import { VerifyConditionsContext } from 'semantic-release';
import { LinearClient } from './linear-client.js';
import { PluginConfig } from '../types.js';
import { setLinearContext } from './context.js';

/**
 * Verify the plugin configuration and Linear API access
 */
export async function verifyConditions(
  pluginConfig: PluginConfig,
  context: VerifyConditionsContext,
): Promise<void> {
  const { logger } = context;
  const { token, teamKeys = [] } = pluginConfig;

  // Check for token in config or environment
  const linearToken = token || process.env.LINEAR_TOKEN;

  if (!linearToken) {
    throw new SemanticReleaseError(
      'No Linear token found',
      'ENOLINEARTOKEN',
      'Please provide LINEAR_TOKEN environment variable.',
    );
  }

  // Validate team keys format if provided
  const teamKeyPattern = /^[A-Z]+$/;
  const branchPattern = /^[A-Za-z0-9._-]+\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
  const invalidTeamKeys = teamKeys.filter(
    (key) => !teamKeyPattern.test(key) && !branchPattern.test(key),
  );

  if (invalidTeamKeys.length > 0) {
    throw new SemanticReleaseError(
      'Invalid team key format',
      'EINVALIDTEAMKEY',
      'Team keys must be uppercase letters (e.g. SD) or branch names (e.g. caio/tk-519-title). ' +
        `Invalid: ${invalidTeamKeys.join(', ')}`,
    );
  }

  // Test API connection
  const client = new LinearClient(linearToken);

  try {
    logger.log('Verifying Linear API access...');
    await client.testConnection();
    logger.log('✓ Linear API access verified');
  } catch (error) {
    throw new SemanticReleaseError(
      'Failed to connect to Linear API',
      'ELINEARCONNECTION',
      `Could not connect to Linear API: ${(error as Error).message}`,
    );
  }

  // Get GitHub config (auto-detect from environment)
  const githubToken = pluginConfig.githubToken || process.env.GITHUB_TOKEN || null;
  const githubApiUrl = pluginConfig.githubApiUrl || 'https://api.github.com';

  // Store validated config for other lifecycle methods
  setLinearContext({
    apiKey: linearToken,
    teamKeys: teamKeys.length > 0 ? teamKeys : null,
    labelPrefix: pluginConfig.labelPrefix || 'v',
    githubToken,
    githubApiUrl,
  });
}
