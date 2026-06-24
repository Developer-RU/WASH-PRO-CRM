import mongoose, { Document, Schema } from 'mongoose';

export interface IEndpointData extends Document {
  endpointId: mongoose.Types.ObjectId;
  resourcePath: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const EndpointDataSchema = new Schema<IEndpointData>(
  {
    endpointId: { type: Schema.Types.ObjectId, ref: 'Endpoint', required: true, index: true },
    resourcePath: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { timestamps: true }
);

EndpointDataSchema.index({ resourcePath: 1, createdAt: -1 });
EndpointDataSchema.index({ endpointId: 1, createdAt: -1 });

export const EndpointData = mongoose.model<IEndpointData>('EndpointData', EndpointDataSchema);
