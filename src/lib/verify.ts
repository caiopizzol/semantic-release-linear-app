import SemanticReleaseError from "@semantic-release/error";
import { VerifyConditionsContext } from "semantic-release";
import { LinearClient } from "./linear-client";
import { PluginConfig, LinearContext } from "../types";

/**
 * Verify the plugin configuration and Linear API access
 */
export async function verifyConditions(
  pluginConfig: PluginConfig,
  context: VerifyConditionsContext & { linear?: LinearContext },
): Promise<void> {
  const { logger } = context;
  const { apiKey, teamKeys = [] } = pluginConfig;

  // Check for API key in config or environment
  const linearApiKey = apiKey || process.env.LINEAR_API_KEY;

  if (!linearApiKey) {
    throw new SemanticReleaseError(
      "No Linear API key found",
      "ENOLINEARTOKEN",
      "Please provide a Linear API key via plugin config or LINEAR_API_KEY environment variable.",
    );
  }

  // Validate team keys format if provided
  if (teamKeys.length > 0 && !teamKeys.every((key) => /^[A-Z]+$/.test(key))) {
    throw new SemanticReleaseError(
      "Invalid team key format",
      "EINVALIDTEAMKEY",
      `Team keys must be uppercase letters only. Got: ${teamKeys.join(", ")}`,
    );
  }

  // Test API connection
  const client = new LinearClient(linearApiKey);

  try {
    logger.log("Verifying Linear API access...");
    await client.testConnection();
    logger.log("✓ Linear API access verified");
  } catch (error) {
    throw new SemanticReleaseError(
      "Failed to connect to Linear API",
      "ELINEARCONNECTION",
      `Could not connect to Linear API: ${(error as Error).message}`,
    );
  }

  // Store validated config in context for other lifecycle methods
  context.linear = {
    apiKey: linearApiKey,
    teamKeys: teamKeys.length > 0 ? teamKeys : null,
    labelPrefix: pluginConfig.labelPrefix || "v",
  };
}
