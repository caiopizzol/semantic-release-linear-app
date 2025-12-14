import { LinearContext } from '../types.js';

/**
 * Module-level storage for Linear context between semantic-release hooks.
 * semantic-release creates separate context objects per hook, so we need
 * to store shared state here.
 */
let linearContext: LinearContext | null = null;

/** Store Linear context for access across hooks */
export function setLinearContext(ctx: LinearContext): void {
  linearContext = ctx;
}

export function getLinearContext(): LinearContext | null {
  return linearContext;
}
