import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// ESM mocks must be set up before imports
jest.unstable_mockModule('@semantic-release/error', () => {
  class SemanticReleaseError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return { default: SemanticReleaseError };
});

jest.unstable_mockModule('./linear-client.js', () => ({
  LinearClient: jest.fn(() => ({
    testConnection: jest.fn(() => Promise.resolve({})),
  })),
}));

jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn() }));

const { verifyConditions } = await import('./verify.js');
import type { VerifyConditionsContext } from 'semantic-release';

describe('verify', () => {
  const mockContext = {
    logger: { log: jest.fn(), error: jest.fn() },
  } as unknown as VerifyConditionsContext;

  beforeEach(() => {
    delete process.env.LINEAR_TOKEN;
  });

  test('throws without token', async () => {
    await expect(verifyConditions({}, mockContext)).rejects.toThrow('No Linear token found');
  });

  test('validates team key format', async () => {
    // Validation happens BEFORE the API call, so it fails fast
    await expect(
      verifyConditions({ token: 'test', teamKeys: ['eng-123'] }, mockContext),
    ).rejects.toThrow('Invalid team key format');
  });

  test('accepts valid branch like team key', async () => {
    // Accepts branch patterns without hitting API
    await expect(
      verifyConditions(
        {
          token: 'test',
          teamKeys: ['caio/tk-519-title'],
        },
        mockContext,
      ),
    ).resolves.toBeUndefined();
  });
});
