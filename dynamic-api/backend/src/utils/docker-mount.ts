import { existsSync, readFileSync } from 'fs';

/** Resolve host source path for a bind mount inside the container (Linux /proc/self/mountinfo). */
export function resolveHostBindPath(containerPath: string): string | null {
  const normalized = containerPath.replace(/\/+$/, '') || '/';
  try {
    const info = readFileSync('/proc/self/mountinfo', 'utf8');
    for (const line of info.split('\n')) {
      const dashIdx = line.indexOf(' - ');
      if (dashIdx < 0) continue;
      const before = line.slice(0, dashIdx).split(' ');
      const after = line.slice(dashIdx + 3).split(' ');
      const mountpoint = before[4];
      if (mountpoint !== normalized) continue;
      const root = after[2];
      const mountSource = before[3];
      if (root && root !== '/') {
        return `${root}${mountSource}`.replace(/\/+/g, '/');
      }
      return mountSource;
    }
  } catch {
    // not Linux or not in container
  }
  return null;
}

export function resolveProjectHostPath(containerPath: string, envOverride?: string): string {
  if (envOverride && envOverride !== '.' && envOverride !== containerPath) {
    return envOverride;
  }
  return resolveHostBindPath(containerPath) ?? containerPath;
}

export function resolveComposeFileHostPath(hostProjectRoot: string, composeFileInContainer: string, projectRootInContainer: string): string {
  if (composeFileInContainer.startsWith(projectRootInContainer)) {
    const suffix = composeFileInContainer.slice(projectRootInContainer.length);
    return `${hostProjectRoot}${suffix}`.replace(/\/+/g, '/');
  }
  return composeFileInContainer;
}

export function scriptExists(projectRoot: string): boolean {
  return (
    existsSync(`${projectRoot}/scripts/self-update.sh`) ||
    existsSync('/app/scripts/self-update.sh')
  );
}
