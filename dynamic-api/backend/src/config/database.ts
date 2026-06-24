import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 30_000,
    retryWrites: true,
  });
  console.log('MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}
