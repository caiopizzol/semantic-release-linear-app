/**
 * semantic-release-linear
 * A semantic-release plugin to update Linear issues with version labels
 */

import { verifyConditions } from "./lib/verify";
import { success } from "./lib/success";

export { verifyConditions, success };

// Also export types for consumers who use TypeScript
export type { PluginConfig } from "./types";
