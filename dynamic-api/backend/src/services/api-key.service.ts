import { comparePassword, hashPassword } from '../utils';
import { apiKeyRepository, generateApiKeyRaw, userRepository } from '../repositories';
import { Permission, JwtPayload } from '../types';

export class ApiKeyService {
  async getAll() {
    const keys = await apiKeyRepository.findAll();
    return keys.map((key) => ({
      _id: key._id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      userId: key.userId,
      enabled: key.enabled,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  async create(dto: {
    name: string;
    permissions: Permission[];
    userId?: string;
    expiresAt?: string;
  }) {
    const rawKey = generateApiKeyRaw();
    const keyHash = await hashPassword(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const record = await apiKeyRepository.create({
      name: dto.name,
      keyHash,
      keyPrefix,
      permissions: dto.permissions,
      userId: dto.userId as unknown as import('mongoose').Types.ObjectId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      enabled: true,
    });

    return {
      _id: record._id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      permissions: record.permissions,
      enabled: record.enabled,
      apiKey: rawKey,
      message: 'Save this API key now — it will not be shown again.',
    };
  }

  async delete(id: string) {
    const deleted = await apiKeyRepository.delete(id);
    if (!deleted) throw new Error('API key not found');
  }

  async authenticate(rawKey: string): Promise<JwtPayload | null> {
    if (!rawKey.startsWith('dap_')) return null;

    const prefix = rawKey.slice(0, 12);
    const candidates = await apiKeyRepository.findByPrefix(prefix);

    for (const candidate of candidates) {
      const valid = await comparePassword(rawKey, candidate.keyHash);
      if (!valid) continue;

      if (!candidate.enabled) return null;
      if (candidate.expiresAt && candidate.expiresAt < new Date()) return null;

      await apiKeyRepository.touchLastUsed(candidate._id.toString());

      let groupIds: string[] = [];
      if (candidate.userId) {
        const user = await userRepository.findById(candidate.userId.toString());
        if (user) {
          groupIds = user.groupIds.map((g) =>
            typeof g === 'object' && g !== null && '_id' in g ? String((g as { _id: unknown })._id) : String(g)
          );
        }
      }

      return {
        userId: candidate.userId?.toString() || `apikey:${candidate._id}`,
        login: `apikey:${candidate.keyPrefix}`,
        email: 'api-key@dynamic-api.local',
        groupIds,
        permissions: candidate.permissions,
      };
    }

    return null;
  }
}

export const apiKeyService = new ApiKeyService();
