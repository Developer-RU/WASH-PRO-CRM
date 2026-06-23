import mongoose, { Document, Schema } from 'mongoose';
import { NetworkAccessRules } from '../types';

export interface IEndpointGroup extends Document {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  networkAccess: NetworkAccessRules;
  createdAt: Date;
  updatedAt: Date;
}

const NetworkAccessSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    allowedDomains: { type: [String], default: [] },
    allowedIpRanges: { type: [String], default: [] },
  },
  { _id: false }
);

const EndpointGroupSchema = new Schema<IEndpointGroup>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, default: 'folder' },
    color: { type: String, default: '#3b82f6' },
    order: { type: Number, default: 0 },
    networkAccess: {
      type: NetworkAccessSchema,
      default: () => ({ enabled: false, allowedDomains: [], allowedIpRanges: [] }),
    },
  },
  { timestamps: true }
);

export const EndpointGroup = mongoose.model<IEndpointGroup>('EndpointGroup', EndpointGroupSchema);
