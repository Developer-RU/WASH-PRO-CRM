import crypto from 'crypto';
import { webhookRepository, logRepository } from '../repositories';
import { WebhookEvent } from '../types';
import { IWebhook } from '../models';

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

function signPayload(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliverWebhook(webhook: IWebhook, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Dynamic-API-Platform-Webhook/1.0',
    'X-Webhook-Event': payload.event,
    ...(webhook.customHeaders || {}),
  };

  if (webhook.secret) {
    headers['X-Webhook-Signature'] = signPayload(webhook.secret, body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    await webhookRepository.update(webhook._id.toString(), {
      lastTriggeredAt: new Date(),
      lastStatus: response.ok ? 'success' : 'error',
    });

    await logRepository.create({
      action: 'webhook_dispatch',
      source: 'system',
      message: `Webhook "${webhook.name}" → ${webhook.url} - ${response.ok ? 'success' : 'error'}`,
      statusCode: response.status,
      details: {
        webhookId: webhook._id.toString(),
        event: payload.event,
        status: response.ok ? 'success' : 'error',
        httpStatus: response.status,
      },
    });

    if (!response.ok) {
      console.error(`Webhook ${webhook.name} failed: HTTP ${response.status}`);
    }
  } catch (error) {
    await webhookRepository.update(webhook._id.toString(), {
      lastTriggeredAt: new Date(),
      lastStatus: 'error',
    });

    await logRepository.create({
      action: 'webhook_dispatch',
      source: 'system',
      message: `Webhook "${webhook.name}" → ${webhook.url} - error`,
      details: {
        webhookId: webhook._id.toString(),
        event: payload.event,
        status: 'error',
        error: error instanceof Error ? error.message : 'delivery failed',
      },
    });

    console.error(`Webhook ${webhook.name} error:`, error instanceof Error ? error.message : error);
  } finally {
    clearTimeout(timeout);
  }
}

export class WebhookService {
  async dispatch(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    const hooks = await webhookRepository.findByEvent(event);
    if (!hooks.length) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await Promise.allSettled(hooks.map((hook) => deliverWebhook(hook, payload)));
  }

  async getAll() {
    return webhookRepository.findAll();
  }

  async create(dto: {
    name: string;
    url: string;
    events: WebhookEvent[];
    secret?: string;
    enabled?: boolean;
    customHeaders?: Record<string, string>;
  }) {
    return webhookRepository.create(dto);
  }

  async update(id: string, dto: Partial<{
    name: string;
    url: string;
    events: WebhookEvent[];
    secret?: string;
    enabled: boolean;
    customHeaders?: Record<string, string>;
  }>) {
    const updated = await webhookRepository.update(id, dto);
    if (!updated) throw new Error('Webhook not found');
    return updated;
  }

  async delete(id: string) {
    const deleted = await webhookRepository.delete(id);
    if (!deleted) throw new Error('Webhook not found');
  }

  async test(id: string) {
    const hook = await webhookRepository.findById(id);
    if (!hook) throw new Error('Webhook not found');
    await deliverWebhook(hook, {
      event: 'endpoint.called',
      timestamp: new Date().toISOString(),
      data: { test: true, message: 'Webhook test from Dynamic API Platform' },
    });
    return { success: true };
  }
}

export const webhookService = new WebhookService();
