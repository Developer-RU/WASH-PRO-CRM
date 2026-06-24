import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { env } from '../config/env';
import { updateService } from './update.service';
import { updateSettingsService } from './update-settings.service';
import { UpdateJob } from '../models/UpdateJob';
import {
  resolveComposeFileHostPath,
  resolveProjectHostPath,
  scriptExists,
} from '../utils/docker-mount';

const UPDATER_IMAGE = process.env.UPDATE_RUNNER_IMAGE || 'docker:26-cli';

export class UpdateExecutorService {
  isAvailable(): boolean {
    return this.getUnavailableReason() === null;
  }

  getUnavailableReason(): string | null {
    if (env.updateExecutorEnabled === false) {
      return 'Update executor is disabled (UPDATE_EXECUTOR_ENABLED=false)';
    }
    if (env.updateDeployMode === 'docker' || env.updateDeployMode === 'docker-replica') {
      if (!existsSync('/var/run/docker.sock')) {
        return 'Docker socket is not available — use docker compose up from the project directory';
      }
      const hostProject = resolveProjectHostPath(env.updateProjectRoot, env.updateHostProjectRoot);
      const hostCompose = resolveComposeFileHostPath(
        hostProject,
        env.updateComposeFile,
        env.updateProjectRoot
      );
      if (!existsSync(hostCompose) && !existsSync(env.updateComposeFile)) {
        return `Compose file not found: ${env.updateComposeFile}`;
      }
      if (!scriptExists(env.updateProjectRoot)) {
        return 'Update scripts not found in the project mount';
      }
      return null;
    }
    if (env.updateDeployMode === 'native') {
      if (!existsSync(env.updateProjectRoot)) {
        return `Project root not found: ${env.updateProjectRoot}`;
      }
      return null;
    }
    return `Unsupported deploy mode: ${env.updateDeployMode}`;
  }

  getScriptPath(): string {
    const deployed = join(env.updateProjectRoot, 'scripts/self-update.sh');
    if (existsSync(deployed)) return deployed;
    return '/app/scripts/self-update.sh';
  }

  private writeJobManifest(
    jobId: string,
    job: { targetTag: string; targetVersion: string; fromVersion: string }
  ): void {
    const settings = updateSettingsService.getCached();
    const manifestPath = join(env.updateDataDir, `job-${jobId}.json`);
    writeFileSync(
      manifestPath,
      JSON.stringify({
        jobId,
        targetTag: job.targetTag,
        targetVersion: job.targetVersion,
        fromVersion: job.fromVersion,
        githubRepo: settings.githubRepo,
      }),
      'utf8'
    );
  }

  async runJob(jobId: string): Promise<void> {
    const job = await UpdateJob.findById(jobId);
    if (!job) {
      await updateService.finishJob(jobId, 'failed', 'Update job not found');
      return;
    }

    const reason = this.getUnavailableReason();
    if (reason) {
      await updateService.finishJob(jobId, 'failed', reason);
      return;
    }

    const script = this.getScriptPath();
    if (!existsSync(script)) {
      await updateService.finishJob(jobId, 'failed', `Update script not found: ${script}`);
      return;
    }

    this.writeJobManifest(jobId, job);

    const scriptArgs = [
      jobId,
      env.updateDataDir,
      env.updateDeployMode,
      env.updateComposeFile,
      env.updateProjectRoot,
      String(env.port),
      env.updateHealthUrl,
    ];

    if (env.updateDeployMode === 'docker' || env.updateDeployMode === 'docker-replica') {
      const hostProject = resolveProjectHostPath(env.updateProjectRoot, env.updateHostProjectRoot);
      const hostCompose = resolveComposeFileHostPath(
        hostProject,
        env.updateComposeFile,
        env.updateProjectRoot
      );
      const containerName = `dap-update-${jobId.slice(-12)}`;
      const containerDataDir = '/data';
      const containerProjectRoot = '/deploy';
      const containerCompose = hostCompose.replace(hostProject, containerProjectRoot);
      const containerArgs = [
        jobId,
        containerDataDir,
        env.updateDeployMode,
        containerCompose,
        containerProjectRoot,
        String(env.port),
        env.updateHealthUrl,
      ];

      const inner = `apk add --no-cache bash git jq curl rsync >/dev/null 2>&1; bash /deploy/scripts/self-update.sh ${containerArgs.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`;

      const dockerArgs = [
        'run',
        '--rm',
        '-d',
        '--name',
        containerName,
        '--add-host=host.docker.internal:host-gateway',
        '-v',
        '/var/run/docker.sock:/var/run/docker.sock',
        '-v',
        `${hostProject}:${containerProjectRoot}`,
        '-v',
        `${env.updateDataVolume}:${containerDataDir}`,
        '-w',
        containerProjectRoot,
      ];

      if (env.updateDockerNetwork) {
        dockerArgs.push('--network', env.updateDockerNetwork);
      }

      dockerArgs.push(UPDATER_IMAGE, 'sh', '-c', inner);

      try {
        await this.spawnDocker(dockerArgs);
        await updateService.markJobStarted(jobId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start updater container';
        await updateService.finishJob(jobId, 'failed', message);
      }
      return;
    }

    try {
      const child = spawn('bash', [script, ...scriptArgs], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      await updateService.markJobStarted(jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start update script';
      await updateService.finishJob(jobId, 'failed', message);
    }
  }

  private spawnDocker(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `docker run exited with code ${code}`));
      });
    });
  }

  async rollbackJob(jobId: string, _userId?: string): Promise<void> {
    const script = join(env.updateProjectRoot, 'scripts/self-update-rollback.sh');
    const fallback = '/app/scripts/self-update-rollback.sh';
    const rollbackScript = existsSync(script) ? script : fallback;
    if (!existsSync(rollbackScript)) {
      throw new Error('Rollback script not found');
    }

    const args = [
      rollbackScript,
      jobId,
      env.updateDataDir,
      env.updateDeployMode,
      env.updateComposeFile,
      env.updateProjectRoot,
      String(env.port),
      env.updateHealthUrl,
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn('bash', args, { stdio: 'inherit' });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Rollback exited with code ${code}`));
      });
      child.on('error', reject);
    });

    await updateService.finishJob(jobId, 'rolled_back', 'Manual rollback completed');
  }
}

export const updateExecutorService = new UpdateExecutorService();
