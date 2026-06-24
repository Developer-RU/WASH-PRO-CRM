import mongoose, { Document, Schema } from 'mongoose';
import { LogAction, LogSource } from '../types';

export interface ILog extends Document {
  action: LogAction;
  source?: LogSource;
  userId?: mongoose.Types.ObjectId;
  endpointId?: mongoose.Types.ObjectId;
  message: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  responseTime?: number;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    action: {
      type: String,
      enum: [
        'login', 'logout', 'register', 'error',
        'endpoint_create', 'endpoint_update', 'endpoint_delete',
        'api_call', 'user_create', 'user_update', 'user_delete',
        'webhook_dispatch', 'cron_run', 'mcp_call', 'api_key_used',
      ],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['direct', 'mcp', 'cron', 'api_key', 'system'],
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    endpointId: { type: Schema.Types.ObjectId, ref: 'Endpoint' },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    statusCode: { type: Number },
    responseTime: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LogSchema.index({ createdAt: -1 });
LogSchema.index({ action: 1, createdAt: -1 });
LogSchema.index({ action: 1, source: 1, createdAt: -1 });
LogSchema.index({ 'details.status': 1, action: 1, createdAt: -1 });

export const Log = mongoose.model<ILog>('Log', LogSchema);
