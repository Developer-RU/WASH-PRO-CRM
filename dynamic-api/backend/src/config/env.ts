import { existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const updateDataDir = process.env.UPDATE_DATA_DIR || '/app/data/updates';

if (!existsSync(updateDataDir)) {
  try {
    mkdirSync(updateDataDir, { recursive: true });
  } catch {
    // read-only or local dev without /app/data
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dynamic_api',
  jwtSecret: process.env.JWT_SECRET || 'dap-super-secret-jwt-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dap-super-secret-refresh-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  csrfSecret: process.env.CSRF_SECRET || 'dap-csrf-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@dynamic-api.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!',
  adminLogin: process.env.ADMIN_LOGIN || 'admin',
  appVersion: process.env.APP_VERSION || '',
  updateExecutorEnabled: process.env.UPDATE_EXECUTOR_ENABLED !== 'false',
  updateDeployMode: process.env.UPDATE_DEPLOY_MODE || 'docker',
  updateComposeFile: process.env.UPDATE_COMPOSE_FILE || '/deploy/docker-compose.yml',
  updateProjectRoot: process.env.UPDATE_PROJECT_ROOT || '/deploy',
  updateHostProjectRoot: process.env.UPDATE_HOST_PROJECT_ROOT || '',
  updateDataDir,
  updateDataVolume: process.env.UPDATE_DATA_VOLUME || 'dap_update_data',
  updateDockerNetwork: process.env.UPDATE_DOCKER_NETWORK || '',
  updateHealthUrl: process.env.UPDATE_HEALTH_URL || 'http://backend:3001/api/health',
};
