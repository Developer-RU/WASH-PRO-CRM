import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Types } from 'mongoose';
import { UpdateJob, IUpdateJob } from '../models/UpdateJob';
import { updateSettingsService, getAppVersion } from './update-settings.service';
import { updateExecutorService } from './update-executor.service';
import { isNewerVersion } from '../utils/semver';
import { env } from '../config/env';

export interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  body: string;
  prerelease: boolean;
  published_at: string;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  latestTag: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  releaseNotes: string | null;
  publishedAt: string | null;
  checkedAt: string;
  executorAvailable: boolean;
  executorReason: string | null;
  deployMode: string;
}

export interface UpdateStatusResponse extends UpdateCheckResult {
  settings: ReturnType<typeof updateSettingsService.getCached>;
  activeJob: IUpdateJob | null;
  recentJobs: IUpdateJob[];
  showNotification: boolean;
}

const DEFAULT_STEPS = [
  { id: 'snapshot', label: 'Save rollback snapshot' },
  { id: 'fetch', label: 'Fetch release' },
  { id: 'deploy', label: 'Apply update' },
  { id: 'health', label: 'Verify health' },
];

export class UpdateService {
  async fetchLatestRelease(): Promise<GitHubRelease | null> {
    const settings = updateSettingsService.getCached();
    const url = `https://api.github.com/repos/${settings.githubRepo}/releases?per_page=10`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Dynamic-API-Platform-Updater',
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    const releases = (await res.json()) as GitHubRelease[];
    const stable = releases.filter((r) => settings.includePrerelease || !r.prerelease);
    return stable[0] ?? null;
  }

  parseVersion(tag: string): string {
    return tag.replace(/^v/i, '');
  }

  async checkForUpdates(persist = true): Promise<UpdateCheckResult> {
    const currentVersion = getAppVersion();
    const checkedAt = new Date().toISOString();
    let latest: GitHubRelease | null = null;

    try {
      latest = await this.fetchLatestRelease();
    } catch (err) {
      if (persist) {
        await updateSettingsService.update({ lastCheckAt: checkedAt });
      }
      throw err;
    }

    const latestVersion = latest ? this.parseVersion(latest.tag_name) : null;
    const updateAvailable = latestVersion
      ? isNewerVersion(latestVersion, currentVersion)
      : false;

    if (persist) {
      const patch: Partial<import('./update-settings.service').UpdateSettings> = {
        lastCheckAt: checkedAt,
      };
      if (updateAvailable && latestVersion) {
        patch.lastNotifiedVersion = latestVersion;
      }
      await updateSettingsService.update(patch);
    }

    return {
      currentVersion,
      latestVersion,
      latestTag: latest?.tag_name ?? null,
      updateAvailable,
      releaseUrl: latest?.html_url ?? null,
      releaseNotes: latest?.body ?? null,
      publishedAt: latest?.published_at ?? null,
      checkedAt,
      executorAvailable: updateExecutorService.isAvailable(),
      executorReason: updateExecutorService.getUnavailableReason(),
      deployMode: env.updateDeployMode,
    };
  }

  async getStatus(): Promise<UpdateStatusResponse> {
    await this.reconcileStaleJobs();
    const settings = await updateSettingsService.load();
    const currentVersion = getAppVersion();
    let check: UpdateCheckResult;

    try {
      if (settings.lastCheckAt) {
        check = {
          currentVersion,
          latestVersion: settings.lastNotifiedVersion,
          latestTag: settings.lastNotifiedVersion ? `v${settings.lastNotifiedVersion}` : null,
          updateAvailable: settings.lastNotifiedVersion
            ? isNewerVersion(settings.lastNotifiedVersion, currentVersion)
            : false,
          releaseUrl: null,
          releaseNotes: null,
          publishedAt: null,
          checkedAt: settings.lastCheckAt,
          executorAvailable: updateExecutorService.isAvailable(),
          executorReason: updateExecutorService.getUnavailableReason(),
          deployMode: env.updateDeployMode,
        };
      } else {
        check = await this.checkForUpdates(true);
      }
    } catch {
      check = {
        currentVersion,
        latestVersion: null,
        latestTag: null,
        updateAvailable: false,
        releaseUrl: null,
        releaseNotes: null,
        publishedAt: null,
        checkedAt: settings.lastCheckAt ?? new Date().toISOString(),
        executorAvailable: updateExecutorService.isAvailable(),
        executorReason: updateExecutorService.getUnavailableReason(),
        deployMode: env.updateDeployMode,
      };
    }

    const activeJob = await UpdateJob.findOne({
      status: { $in: ['queued', 'running', 'rolling_back'] },
    }).sort({ createdAt: -1 });

    const recentJobs = await UpdateJob.find().sort({ createdAt: -1 }).limit(5);

    const dismissed = settings.dismissedVersion;
    const showNotification =
      settings.notifyEnabled &&
      check.updateAvailable &&
      !!check.latestVersion &&
      check.latestVersion !== dismissed &&
      !activeJob;

    return {
      ...check,
      settings,
      activeJob,
      recentJobs,
      showNotification,
    };
  }

  async dismissNotification(version: string): Promise<void> {
    await updateSettingsService.update({ dismissedVersion: version });
  }

  async startUpdate(options: {
    targetVersion?: string;
    targetTag?: string;
    userId?: string;
    trigger: 'manual' | 'auto' | 'scheduled';
  }): Promise<IUpdateJob> {
    await this.reconcileStaleJobs();

    const running = await UpdateJob.findOne({
      status: { $in: ['queued', 'running', 'rolling_back'] },
    });
    if (running) {
      throw new Error('An update is already in progress');
    }

    const check = await this.checkForUpdates(false);
    const targetTag = options.targetTag ?? check.latestTag;
    const targetVersion = options.targetVersion ?? (targetTag ? this.parseVersion(targetTag) : check.latestVersion);

    if (!targetTag || !targetVersion) {
      throw new Error('No target version available');
    }

    if (!isNewerVersion(targetVersion, getAppVersion()) && options.trigger === 'manual') {
      throw new Error(`Version ${targetVersion} is not newer than current ${getAppVersion()}`);
    }

    if (!updateExecutorService.isAvailable()) {
      throw new Error(
        updateExecutorService.getUnavailableReason() ??
          'Auto-update is not available on this server. Deploy with Docker Compose from the project directory.'
      );
    }

    const job = await UpdateJob.create({
      status: 'queued',
      fromVersion: getAppVersion(),
      targetVersion,
      targetTag,
      releaseUrl: check.releaseUrl ?? undefined,
      releaseNotes: check.releaseNotes ?? undefined,
      trigger: options.trigger,
      triggeredBy: options.userId ? new Types.ObjectId(options.userId) : undefined,
      steps: DEFAULT_STEPS.map((s) => ({ ...s, status: 'pending' as const })),
    });

    void updateExecutorService.runJob(String(job._id));

    return job;
  }

  async rollback(jobId: string, userId?: string): Promise<IUpdateJob> {
    const job = await UpdateJob.findById(jobId);
    if (!job) throw new Error('Update job not found');
    if (!job.rollbackSnapshot) {
      throw new Error('No rollback snapshot for this job');
    }
    await updateExecutorService.rollbackJob(String(job._id), userId);
    return (await UpdateJob.findById(jobId))!;
  }

  async updateJobStep(
    jobId: string,
    stepId: string,
    status: 'running' | 'completed' | 'failed' | 'skipped',
    message?: string
  ): Promise<void> {
    const job = await UpdateJob.findById(jobId);
    if (!job) return;

    const steps = job.steps.map((step) =>
      step.id === stepId
        ? { ...step, status, message, at: new Date() }
        : step
    );
    job.steps = steps;
    if (status === 'running' && job.status === 'queued') {
      job.status = 'running';
      job.startedAt = new Date();
    }
    await job.save();
  }

  async finishJob(
    jobId: string,
    status: 'completed' | 'failed' | 'rolled_back',
    error?: string,
    rollbackSnapshot?: Record<string, unknown>
  ): Promise<void> {
    const job = await UpdateJob.findById(jobId);
    if (!job) return;

    job.status = status;
    job.finishedAt = new Date();
    if (error) job.error = error;
    if (rollbackSnapshot) job.rollbackSnapshot = rollbackSnapshot;

    if (status === 'completed') {
      await updateSettingsService.update({
        lastAppliedVersion: job.targetVersion,
        dismissedVersion: job.targetVersion,
      });
    }

    await job.save();
  }

  async markJobStarted(jobId: string): Promise<void> {
    const job = await UpdateJob.findById(jobId);
    if (!job || job.status !== 'queued') return;

    job.status = 'running';
    job.startedAt = new Date();
    job.steps = job.steps.map((step, index) =>
      index === 0
        ? { ...step, status: 'running', message: 'Updater started', at: new Date() }
        : step
    );
    await job.save();
  }

  async reconcileStaleJobs(): Promise<void> {
    const current = getAppVersion();
    const active = await UpdateJob.find({
      status: { $in: ['queued', 'running', 'rolling_back'] },
    });
    const now = Date.now();

    for (const job of active) {
      const outdatedTarget = !isNewerVersion(job.targetVersion, current);
      if (outdatedTarget) {
        await this.finishJob(
          String(job._id),
          'failed',
          `Already on v${current} — update to v${job.targetVersion} is no longer needed`
        );
        continue;
      }

      const ref = job.startedAt ?? job.createdAt;
      const ageMs = now - new Date(ref).getTime();

      if (job.status === 'queued' && ageMs > 10 * 60 * 1000) {
        await this.finishJob(String(job._id), 'failed', 'Update timed out — updater never started');
        continue;
      }

      if (job.status === 'running' && ageMs > 60 * 60 * 1000) {
        await this.finishJob(String(job._id), 'failed', 'Update timed out — no completion signal');
      }
    }
  }

  async cancelJob(jobId: string): Promise<IUpdateJob> {
    const job = await UpdateJob.findById(jobId);
    if (!job) throw new Error('Update job not found');
    if (!['queued', 'running'].includes(job.status)) {
      throw new Error('Only active jobs can be cancelled');
    }
    await this.finishJob(jobId, 'failed', 'Cancelled by user');
    const updated = await UpdateJob.findById(jobId);
    if (!updated) throw new Error('Update job not found');
    return updated;
  }

  processResultFile(): void {
    const resultPath = join(env.updateDataDir, 'update-result.json');
    if (!existsSync(resultPath)) return;

    try {
      const raw = readFileSync(resultPath, 'utf8');
      const data = JSON.parse(raw) as {
        jobId: string;
        status: 'completed' | 'failed' | 'rolled_back';
        error?: string;
        rollbackSnapshot?: Record<string, unknown>;
      };
      void this.finishJob(data.jobId, data.status, data.error, data.rollbackSnapshot);
      unlinkSync(resultPath);
    } catch (err) {
      console.error('Failed to process update result file:', err);
    }
  }

  processProgressFile(): void {
    const progressPath = join(env.updateDataDir, 'update-progress.json');
    if (!existsSync(progressPath)) return;

    try {
      const raw = readFileSync(progressPath, 'utf8');
      const data = JSON.parse(raw) as {
        jobId: string;
        status?: string;
        steps?: Array<{ id: string; status: string; message?: string }>;
        rollbackSnapshot?: Record<string, unknown>;
      };
      void this.applyProgress(data);
    } catch (err) {
      console.error('Failed to process update progress file:', err);
    }
  }

  private async applyProgress(data: {
    jobId: string;
    status?: string;
    steps?: Array<{ id: string; status: string; message?: string }>;
    rollbackSnapshot?: Record<string, unknown>;
  }): Promise<void> {
    const job = await UpdateJob.findById(data.jobId);
    if (!job) return;

    if (data.steps?.length) {
      job.steps = job.steps.map((step) => {
        const incoming = data.steps!.find((s) => s.id === step.id);
        if (!incoming) return step;
        return {
          ...step,
          status: incoming.status as typeof step.status,
          message: incoming.message,
          at: ['running', 'completed', 'failed'].includes(incoming.status) ? new Date() : step.at,
        };
      });
    }

    if (data.rollbackSnapshot && Object.keys(data.rollbackSnapshot).length > 0) {
      job.rollbackSnapshot = data.rollbackSnapshot;
    }

    if (data.status === 'running' && job.status === 'queued') {
      job.status = 'running';
      job.startedAt = new Date();
    }
    if (data.status === 'rolling_back') {
      job.status = 'rolling_back';
    }

    await job.save();
  }
}

export const updateService = new UpdateService();
