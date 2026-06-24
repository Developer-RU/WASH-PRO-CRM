import mongoose, { Document, Schema, Types } from 'mongoose';

export type UpdateJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rolling_back'
  | 'rolled_back';

export type UpdateStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface IUpdateStep {
  id: string;
  label: string;
  status: UpdateStepStatus;
  message?: string;
  at?: Date;
}

export interface IUpdateJob extends Document {
  status: UpdateJobStatus;
  fromVersion: string;
  targetVersion: string;
  targetTag: string;
  releaseUrl?: string;
  releaseNotes?: string;
  steps: IUpdateStep[];
  rollbackSnapshot?: Record<string, unknown>;
  error?: string;
  triggeredBy?: Types.ObjectId;
  trigger: 'manual' | 'auto' | 'scheduled';
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UpdateStepSchema = new Schema<IUpdateStep>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    message: String,
    at: Date,
  },
  { _id: false }
);

const UpdateJobSchema = new Schema<IUpdateJob>(
  {
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'rolling_back', 'rolled_back'],
      default: 'queued',
    },
    fromVersion: { type: String, required: true },
    targetVersion: { type: String, required: true },
    targetTag: { type: String, required: true },
    releaseUrl: String,
    releaseNotes: String,
    steps: { type: [UpdateStepSchema], default: [] },
    rollbackSnapshot: Schema.Types.Mixed,
    error: String,
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    trigger: { type: String, enum: ['manual', 'auto', 'scheduled'], default: 'manual' },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

UpdateJobSchema.index({ status: 1, createdAt: -1 });

export const UpdateJob = mongoose.model<IUpdateJob>('UpdateJob', UpdateJobSchema);
