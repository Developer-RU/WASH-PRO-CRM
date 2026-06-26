import { describe, expect, it } from 'vitest';
import { validateGithubRepo } from './github-repo';

describe('validateGithubRepo', () => {
  it('accepts owner/repo', () => {
    expect(validateGithubRepo('Dynamic-API-Platform/Dynamic-API-Platform')).toBe(
      'Dynamic-API-Platform/Dynamic-API-Platform'
    );
  });

  it('rejects URLs and path traversal', () => {
    expect(() => validateGithubRepo('https://evil.com/x')).toThrow();
    expect(() => validateGithubRepo('owner/../repo')).toThrow();
    expect(() => validateGithubRepo('no-slash')).toThrow();
  });
});
