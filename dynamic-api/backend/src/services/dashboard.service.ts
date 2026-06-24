import {
  userRepository,
  endpointRepository,
  endpointGroupRepository,
  logRepository,
  cronJobRepository,
  webhookRepository,
  apiKeyRepository,
} from '../repositories';
import { DashboardStats } from '../types';
import { buildTextSearchFilter } from '../utils';
import { FilterQuery } from 'mongoose';
import { ILog } from '../models';

const DAYS = 7;

export class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const since = new Date();
    since.setDate(since.getDate() - DAYS);

    const [
      users,
      endpoints,
      groups,
      requests,
      errors,
      activeUsers,
      cronJobs,
      cronJobsEnabled,
      webhooks,
      webhooksEnabled,
      apiKeys,
      mcpTools,
      requestsOverTime,
      errorsOverTime,
      loginsOverTime,
      webhooksOverTime,
      cronRunsOverTime,
      trafficBySource,
      trafficBySourceOverTime,
      cronErrors,
      webhookErrors,
      unusedApiKeys,
    ] = await Promise.all([
      userRepository.count(),
      endpointRepository.count({ isSystem: false }),
      endpointGroupRepository.count(),
      logRepository.countSince({ action: 'api_call' }, DAYS),
      logRepository.countSince({ action: 'error' }, DAYS),
      userRepository.countActive(since),
      cronJobRepository.count(),
      cronJobRepository.countEnabled(),
      webhookRepository.count(),
      webhookRepository.countEnabled(),
      apiKeyRepository.countEnabled(),
      endpointRepository.count({ isSystem: false, enabled: true }),
      logRepository.countByActionOverTime('api_call', DAYS),
      logRepository.countByActionOverTime('error', DAYS),
      logRepository.countLoginsOverTime(DAYS),
      logRepository.countByActionStatusOverTime('webhook_dispatch', DAYS),
      logRepository.countByActionStatusOverTime('cron_run', DAYS),
      logRepository.countTrafficBySource(DAYS),
      logRepository.countTrafficBySourceOverTime(DAYS),
      cronJobRepository.findWithErrors(),
      webhookRepository.findWithErrors(),
      apiKeyRepository.findUnused(),
    ]);

    return {
      users,
      endpoints,
      groups,
      requests,
      errors,
      activeUsers,
      cronJobs,
      cronJobsEnabled,
      webhooks,
      webhooksEnabled,
      apiKeys,
      mcpTools,
      requestsOverTime: this.fillMissingDays(requestsOverTime, DAYS),
      errorsOverTime: this.fillMissingDays(errorsOverTime, DAYS),
      loginsOverTime: this.fillMissingDays(loginsOverTime, DAYS),
      webhooksOverTime: this.fillMissingStatusDays(webhooksOverTime, DAYS),
      cronRunsOverTime: this.fillMissingStatusDays(cronRunsOverTime, DAYS),
      trafficBySource: {
        direct: trafficBySource.direct || 0,
        mcp: trafficBySource.mcp || 0,
        cron: trafficBySource.cron || 0,
        api_key: trafficBySource.api_key || 0,
      },
      trafficBySourceOverTime: this.fillMissingTrafficDays(trafficBySourceOverTime, DAYS),
      automationHealth: {
        cronErrors: cronErrors.map((job) => ({
          id: job._id.toString(),
          name: job.name,
          message: job.lastRunMessage,
        })),
        webhookErrors: webhookErrors.map((hook) => ({
          id: hook._id.toString(),
          name: hook.name,
          url: hook.url,
        })),
        unusedApiKeys: unusedApiKeys.map((key) => ({
          id: key._id.toString(),
          name: key.name,
          keyPrefix: key.keyPrefix,
        })),
      },
    };
  }

  private fillMissingDays(data: { date: string; count: number }[], days: number): { date: string; count: number }[] {
    const result: { date: string; count: number }[] = [];
    const map = new Map(data.map((d) => [d.date, d.count]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      result.push({ date: key, count: map.get(key) || 0 });
    }

    return result;
  }

  private fillMissingStatusDays(
    data: { date: string; success: number; error: number }[],
    days: number
  ): { date: string; success: number; error: number }[] {
    const map = new Map(data.map((d) => [d.date, d]));
    const result: { date: string; success: number; error: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      result.push(map.get(key) || { date: key, success: 0, error: 0 });
    }

    return result;
  }

  private fillMissingTrafficDays(
    data: { date: string; direct: number; mcp: number; cron: number; api_key: number }[],
    days: number
  ): { date: string; direct: number; mcp: number; cron: number; api_key: number }[] {
    const map = new Map(data.map((d) => [d.date, d]));
    const result: { date: string; direct: number; mcp: number; cron: number; api_key: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      result.push(map.get(key) || { date: key, direct: 0, mcp: 0, cron: 0, api_key: 0 });
    }

    return result;
  }
}

export class LogService {
  async getAll(page = 1, limit = 50, action?: string, search?: string) {
    const filter: FilterQuery<ILog> = {};
    if (action) filter.action = action;

    const textFilter = buildTextSearchFilter(search, ['message', 'action', 'ip', 'source', 'userAgent']);
    if (textFilter) {
      Object.assign(filter, textFilter);
    }

    return logRepository.findAll(page, limit, filter);
  }
}

export const dashboardService = new DashboardService();
export const logService = new LogService();
