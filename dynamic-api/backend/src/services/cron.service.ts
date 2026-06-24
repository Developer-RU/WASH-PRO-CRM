import vm from 'vm';
import cron, { ScheduledTask } from 'node-cron';
import { cronJobRepository, logRepository } from '../repositories';
import { ICronJob } from '../models';
import { dynamicEngine } from './endpoint.service';

const CRON_TIMEOUT_MS = 10000;

export class CronSchedulerService {
  private tasks = new Map<string, ScheduledTask>();

  async start(): Promise<void> {
    const jobs = await cronJobRepository.findEnabled();
    for (const job of jobs) {
      this.scheduleJob(job);
    }
    console.log(`Cron scheduler: ${jobs.length} job(s) active`);
  }

  async reload(): Promise<void> {
    for (const task of this.tasks.values()) {
      task.stop();
    }
    this.tasks.clear();
    await this.start();
  }

  scheduleJob(job: ICronJob): void {
    const id = job._id.toString();
    if (this.tasks.has(id)) {
      this.tasks.get(id)!.stop();
      this.tasks.delete(id);
    }

    if (!job.enabled || !cron.validate(job.schedule)) return;

    const task = cron.schedule(job.schedule, () => {
      void this.runJob(id);
    });
    this.tasks.set(id, task);
  }

  unscheduleJob(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.stop();
      this.tasks.delete(id);
    }
  }

  async runJob(id: string): Promise<{ success: boolean; message: string }> {
    const job = await cronJobRepository.findById(id);
    if (!job) throw new Error('Cron job not found');

    try {
      const message = await this.executeAction(job);
      await cronJobRepository.update(id, {
        lastRunAt: new Date(),
        lastRunStatus: 'success',
        lastRunMessage: message,
      });
      await logRepository.create({
        action: 'cron_run',
        source: 'system',
        message: `Cron "${job.name}" - success`,
        details: {
          cronJobId: id,
          actionType: job.actionType,
          status: 'success',
        },
      });
      return { success: true, message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cron job failed';
      await cronJobRepository.update(id, {
        lastRunAt: new Date(),
        lastRunStatus: 'error',
        lastRunMessage: message,
      });
      await logRepository.create({
        action: 'cron_run',
        source: 'system',
        message: `Cron "${job.name}" - error`,
        details: {
          cronJobId: id,
          actionType: job.actionType,
          status: 'error',
          error: message,
        },
      });
      throw error;
    }
  }

  private async executeAction(job: ICronJob): Promise<string> {
    switch (job.actionType) {
      case 'javascript':
        return this.runJavascript(job.javascriptCode || '');
      case 'http':
        return this.runHttp(job.httpMethod || 'GET', job.httpUrl || '', job.httpBody);
      case 'endpoint':
        return this.runEndpoint(job.endpointMethod || 'GET', job.endpointPath || '');
      default:
        throw new Error(`Unknown action type: ${job.actionType}`);
    }
  }

  private async runJavascript(code: string): Promise<string> {
    const wrapped = `(async () => {
${code}
if (typeof run !== 'function') {
  throw new Error('Define async function run() { ... }');
}
return await run();
})()`;

    const sandbox = {
      console: { log: (...args: unknown[]) => console.log('[cron]', ...args) },
      fetch: globalThis.fetch,
    };
    const context = vm.createContext(sandbox);
    const script = new vm.Script(wrapped);
    const result = await script.runInContext(context, { timeout: CRON_TIMEOUT_MS });
    return typeof result === 'string' ? result : JSON.stringify(result ?? { ok: true });
  }

  private async runHttp(method: string, url: string, body?: string): Promise<string> {
    if (!url) throw new Error('HTTP URL is required');
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
      body: body && method.toUpperCase() !== 'GET' ? body : undefined,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    return `HTTP ${response.status}`;
  }

  private async runEndpoint(method: string, path: string): Promise<string> {
    if (!path) throw new Error('Endpoint path is required');
    const result = await dynamicEngine.handleRequest(path, method.toUpperCase(), {}, {}, undefined, {
      ip: '127.0.0.1',
      userAgent: 'cron-scheduler',
      source: 'cron',
    });
    if (result.statusCode >= 400) {
      throw new Error(`Endpoint returned ${result.statusCode}`);
    }
    return `Endpoint ${method} ${path} → ${result.statusCode}`;
  }

  async getAll() {
    return cronJobRepository.findAll();
  }

  async create(dto: Partial<ICronJob>) {
    if (!dto.schedule || !cron.validate(dto.schedule)) {
      throw new Error('Invalid cron schedule expression');
    }
    const job = await cronJobRepository.create(dto);
    if (job.enabled) this.scheduleJob(job);
    return job;
  }

  async update(id: string, dto: Partial<ICronJob>) {
    if (dto.schedule && !cron.validate(dto.schedule)) {
      throw new Error('Invalid cron schedule expression');
    }
    const job = await cronJobRepository.update(id, dto);
    if (!job) throw new Error('Cron job not found');
    if (job.enabled) this.scheduleJob(job);
    else this.unscheduleJob(id);
    return job;
  }

  async delete(id: string) {
    this.unscheduleJob(id);
    const deleted = await cronJobRepository.delete(id);
    if (!deleted) throw new Error('Cron job not found');
  }
}

export const cronScheduler = new CronSchedulerService();
