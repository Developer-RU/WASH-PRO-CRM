import crypto from 'crypto';
import { FilterQuery } from 'mongoose';
import { CronJob, ICronJob, Webhook, IWebhook, ApiKey, IApiKey } from '../models';

export class CronJobRepository {
  async findAll(): Promise<ICronJob[]> {
    return CronJob.find().sort({ name: 1 });
  }

  async findById(id: string): Promise<ICronJob | null> {
    return CronJob.findById(id);
  }

  async findEnabled(): Promise<ICronJob[]> {
    return CronJob.find({ enabled: true });
  }

  async count(filter: FilterQuery<ICronJob> = {}): Promise<number> {
    return CronJob.countDocuments(filter);
  }

  async countEnabled(): Promise<number> {
    return CronJob.countDocuments({ enabled: true });
  }

  async findWithErrors(): Promise<ICronJob[]> {
    return CronJob.find({ lastRunStatus: 'error' }).sort({ lastRunAt: -1 }).limit(10);
  }

  async create(data: Partial<ICronJob>): Promise<ICronJob> {
    return CronJob.create(data);
  }

  async update(id: string, data: Partial<ICronJob>): Promise<ICronJob | null> {
    return CronJob.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await CronJob.findByIdAndDelete(id);
    return !!result;
  }
}

export class WebhookRepository {
  async findAll(): Promise<IWebhook[]> {
    return Webhook.find().sort({ name: 1 });
  }

  async findById(id: string): Promise<IWebhook | null> {
    return Webhook.findById(id);
  }

  async findByEvent(event: string): Promise<IWebhook[]> {
    return Webhook.find({ enabled: true, events: event });
  }

  async count(filter: FilterQuery<IWebhook> = {}): Promise<number> {
    return Webhook.countDocuments(filter);
  }

  async countEnabled(): Promise<number> {
    return Webhook.countDocuments({ enabled: true });
  }

  async findWithErrors(): Promise<IWebhook[]> {
    return Webhook.find({ lastStatus: 'error' }).sort({ lastTriggeredAt: -1 }).limit(10);
  }

  async create(data: Partial<IWebhook>): Promise<IWebhook> {
    return Webhook.create(data);
  }

  async update(id: string, data: Partial<IWebhook>): Promise<IWebhook | null> {
    return Webhook.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await Webhook.findByIdAndDelete(id);
    return !!result;
  }
}

export class ApiKeyRepository {
  async findAll(): Promise<IApiKey[]> {
    return ApiKey.find().sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IApiKey | null> {
    return ApiKey.findById(id);
  }

  async findByPrefix(prefix: string): Promise<IApiKey[]> {
    return ApiKey.find({ keyPrefix: prefix, enabled: true });
  }

  async countEnabled(): Promise<number> {
    return ApiKey.countDocuments({ enabled: true });
  }

  async findUnused(): Promise<IApiKey[]> {
    return ApiKey.find({ enabled: true, lastUsedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(10);
  }

  async create(data: Partial<IApiKey>): Promise<IApiKey> {
    return ApiKey.create(data);
  }

  async update(id: string, data: Partial<IApiKey>): Promise<IApiKey | null> {
    return ApiKey.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await ApiKey.findByIdAndDelete(id);
    return !!result;
  }

  async touchLastUsed(id: string): Promise<void> {
    await ApiKey.findByIdAndUpdate(id, { lastUsedAt: new Date() });
  }
}

export function generateApiKeyRaw(): string {
  return `dap_${crypto.randomBytes(24).toString('hex')}`;
}

export const cronJobRepository = new CronJobRepository();
export const webhookRepository = new WebhookRepository();
export const apiKeyRepository = new ApiKeyRepository();
