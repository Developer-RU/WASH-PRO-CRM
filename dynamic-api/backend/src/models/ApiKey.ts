import mongoose, { Document, Schema } from 'mongoose';
import { Permission } from '../types';

export interface IApiKey extends Document {
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: Permission[];
  userId?: mongoose.Types.ObjectId;
  enabled: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true },
    keyPrefix: { type: String, required: true },
    permissions: {
      type: [String],
      enum: ['view', 'create', 'update', 'delete', 'manage_users', 'manage_api', 'view_logs'],
      default: ['view'],
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    enabled: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

ApiKeySchema.index({ keyPrefix: 1, enabled: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
