// Minimal ESM mocks
jest.mock('@semantic-release/error', () => {
  class SemanticReleaseError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return { __esModule: true, default: SemanticReleaseError };
});

jest.mock('./linear-client', () => ({
  LinearClient: jest.fn().mockImplementation(() => ({
    testConnection: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('node-fetch', () => ({ __esModule: true, default: jest.fn() }));

import { verifyConditions } from './verify';
import { VerifyConditionsContext } from 'semantic-release';

describe('verify', () => {
  const mockContext = {
    logger: { log: jest.fn(), error: jest.fn() },
  } as VerifyConditionsContext;

  beforeEach(() => {
    delete process.env.LINEAR_API_KEY;
  });

  test('throws without API key', async () => {
    await expect(verifyConditions({}, mockContext)).rejects.toThrow('No Linear API key found');
  });

  test('validates team key format', async () => {
    // Validation happens BEFORE the API call, so it fails fast
    await expect(
      verifyConditions({ apiKey: 'test', teamKeys: ['eng-123'] }, mockContext),
    ).rejects.toThrow('Invalid team key format');
  });

  test('accepts valid branch like team key', async () => {
    // Accepts branch patterns without hitting API
    await expect(
      verifyConditions(
        {
          apiKey: 'test',
          teamKeys: ['caio/tk-519-title'],
        },
        mockContext,
      ),
    ).resolves.toBeUndefined();
  });
});
