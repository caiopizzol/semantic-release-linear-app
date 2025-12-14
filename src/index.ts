/**
 * semantic-release-linear-app
 * A semantic-release plugin to update Linear issues with version labels
 */

import { verifyConditions } from './lib/verify.js';
import { success } from './lib/success.js';

export { verifyConditions, success };

// Also export types for consumers who use TypeScript
export type { PluginConfig } from './types.js';
