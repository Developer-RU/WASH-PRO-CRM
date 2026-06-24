import mongoose, { Document, Schema } from 'mongoose';

export type CronActionType = 'javascript' | 'http' | 'endpoint';

export interface ICronJob extends Document {
  name: string;
  description?: string;
  schedule: string;
  actionType: CronActionType;
  javascriptCode?: string;
  httpUrl?: string;
  httpMethod?: string;
  httpBody?: string;
  endpointPath?: string;
  endpointMethod?: string;
  enabled: boolean;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'error';
  lastRunMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CronJobSchema = new Schema<ICronJob>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    schedule: { type: String, required: true, trim: true },
    actionType: { type: String, enum: ['javascript', 'http', 'endpoint'], required: true },
    javascriptCode: { type: String },
    httpUrl: { type: String },
    httpMethod: { type: String, default: 'GET' },
    httpBody: { type: String },
    endpointPath: { type: String },
    endpointMethod: { type: String, default: 'GET' },
    enabled: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ['success', 'error'] },
    lastRunMessage: { type: String },
  },
  { timestamps: true }
);

export const CronJob = mongoose.model<ICronJob>('CronJob', CronJobSchema);
