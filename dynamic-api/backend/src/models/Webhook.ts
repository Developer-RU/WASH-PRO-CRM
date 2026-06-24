import mongoose, { Document, Schema } from 'mongoose';
import { WebhookEvent } from '../types';

export interface IWebhook extends Document {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;
  customHeaders?: Record<string, string>;
  lastTriggeredAt?: Date;
  lastStatus?: 'success' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    events: {
      type: [String],
      enum: [
        'user.created', 'user.updated', 'user.deleted',
        'endpoint.created', 'endpoint.updated', 'endpoint.deleted',
        'endpoint.called', 'api.error',
      ],
      default: [],
    },
    secret: { type: String },
    enabled: { type: Boolean, default: true },
    customHeaders: { type: Schema.Types.Mixed },
    lastTriggeredAt: { type: Date },
    lastStatus: { type: String, enum: ['success', 'error'] },
  },
  { timestamps: true }
);

export const Webhook = mongoose.model<IWebhook>('Webhook', WebhookSchema);
