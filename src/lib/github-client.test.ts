import { describe, test, expect } from '@jest/globals';
import { parseGitHubUrl } from './github-client.js';

describe('github-client', () => {
  describe('parseGitHubUrl', () => {
    test('parses HTTPS URL', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    test('parses HTTPS URL with .git suffix', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    test('parses SSH URL', () => {
      const result = parseGitHubUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    test('parses git+https URL', () => {
      const result = parseGitHubUrl('git+https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    test('returns null for empty URL', () => {
      const result = parseGitHubUrl('');
      expect(result).toBeNull();
    });

    test('returns null for non-GitHub URL', () => {
      const result = parseGitHubUrl('https://gitlab.com/owner/repo');
      expect(result).toBeNull();
    });

    test('handles URLs with extra path segments', () => {
      const result = parseGitHubUrl('https://github.com/Harbour-Enterprises/SuperDoc');
      expect(result).toEqual({ owner: 'Harbour-Enterprises', repo: 'SuperDoc' });
    });
  });
});
