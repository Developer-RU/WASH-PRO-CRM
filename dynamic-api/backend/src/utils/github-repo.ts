const GITHUB_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function validateGithubRepo(repo: string): string {
  const trimmed = repo.trim();
  if (!GITHUB_REPO_RE.test(trimmed)) {
    throw new Error('githubRepo must be in owner/repo format (letters, numbers, ., -, _)');
  }
  return trimmed;
}
