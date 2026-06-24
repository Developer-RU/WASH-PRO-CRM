import mongoose, { Document, Schema } from 'mongoose';
import { AccessType, EndpointHandler, HttpMethod, NetworkAccessRules, SchemaField } from '../types';

export interface IEndpoint extends Document {
  name: string;
  description?: string;
  slug: string;
  path: string;
  method: HttpMethod;
  apiVersion?: string;
  groupId?: mongoose.Types.ObjectId;
  fields: SchemaField[];
  accessType: AccessType;
  allowedGroupIds: mongoose.Types.ObjectId[];
  networkAccess: NetworkAccessRules;
  inheritGroupNetworkAccess: boolean;
  handlers: EndpointHandler[];
  isSystem: boolean;
  enabled: boolean;
  callCount: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SchemaFieldSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array', 'datetime', 'json', 'reference'],
      required: true,
    },
    required: { type: Boolean, default: false },
    description: { type: String },
    defaultValue: { type: Schema.Types.Mixed },
    order: { type: Number, default: 0 },
    children: [{ type: Schema.Types.Mixed }],
    refEndpointId: { type: String },
  },
  { _id: false }
);

const NetworkAccessSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    allowedDomains: { type: [String], default: [] },
    allowedIpRanges: { type: [String], default: [] },
  },
  { _id: false }
);

const EndpointHandlerSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['pre', 'post', 'transform', 'javascript'], required: true },
    code: { type: String },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const EndpointSchema = new Schema<IEndpoint>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    slug: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
    apiVersion: { type: String, trim: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'EndpointGroup' },
    fields: {
      type: [SchemaFieldSchema],
      default: [],
    },
    accessType: { type: String, enum: ['public', 'authenticated', 'group'], default: 'authenticated' },
    allowedGroupIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    networkAccess: {
      type: NetworkAccessSchema,
      default: () => ({ enabled: false, allowedDomains: [], allowedIpRanges: [] }),
    },
    inheritGroupNetworkAccess: { type: Boolean, default: true },
    handlers: {
      type: [EndpointHandlerSchema],
      default: [],
    },
    isSystem: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    callCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EndpointSchema.index({ path: 1, method: 1 }, { unique: true });
EndpointSchema.index({ enabled: 1, isSystem: 1 });
EndpointSchema.index({ groupId: 1 });

export const Endpoint = mongoose.model<IEndpoint>('Endpoint', EndpointSchema);
