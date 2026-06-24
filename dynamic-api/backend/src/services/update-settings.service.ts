import { readFileSync } from 'fs';
import { join } from 'path';
import { SystemSettings } from '../models';

export interface UpdateSettings {
  checkEnabled: boolean;
  notifyEnabled: boolean;
  autoUpdateEnabled: boolean;
  checkIntervalHours: number;
  autoUpdateIntervalHours: number;
  githubRepo: string;
  includePrerelease: boolean;
  lastCheckAt: string | null;
  lastNotifiedVersion: string | null;
  dismissedVersion: string | null;
  lastAppliedVersion: string | null;
}

const DEFAULTS: UpdateSettings = {
  checkEnabled: true,
  notifyEnabled: true,
  autoUpdateEnabled: false,
  checkIntervalHours: 24,
  autoUpdateIntervalHours: 168,
  githubRepo: 'Dynamic-API-Platform/Dynamic-API-Platform',
  includePrerelease: false,
  lastCheckAt: null,
  lastNotifiedVersion: null,
  dismissedVersion: null,
  lastAppliedVersion: null,
};

const KEY_MAP: Record<keyof UpdateSettings, string> = {
  checkEnabled: 'update_check_enabled',
  notifyEnabled: 'update_notify_enabled',
  autoUpdateEnabled: 'update_auto_enabled',
  checkIntervalHours: 'update_check_interval_hours',
  autoUpdateIntervalHours: 'update_auto_interval_hours',
  githubRepo: 'update_github_repo',
  includePrerelease: 'update_include_prerelease',
  lastCheckAt: 'update_last_check_at',
  lastNotifiedVersion: 'update_last_notified_version',
  dismissedVersion: 'update_dismissed_version',
  lastAppliedVersion: 'update_last_applied_version',
};

const REVERSE_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
) as Record<string, keyof UpdateSettings>;

export function getAppVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

class UpdateSettingsService {
  private cache: UpdateSettings = { ...DEFAULTS };

  getCached(): UpdateSettings {
    return { ...this.cache };
  }

  async load(): Promise<UpdateSettings> {
    const docs = await SystemSettings.find({
      key: { $in: Object.values(KEY_MAP) },
    });
    const settings = { ...DEFAULTS };
    for (const doc of docs) {
      const field = REVERSE_MAP[doc.key];
      if (field) {
        (settings as Record<string, unknown>)[field] = doc.value;
      }
    }
    this.cache = settings;
    return settings;
  }

  async update(partial: Partial<UpdateSettings>): Promise<UpdateSettings> {
    for (const [field, value] of Object.entries(partial)) {
      const key = KEY_MAP[field as keyof UpdateSettings];
      if (!key || value === undefined) continue;
      await SystemSettings.findOneAndUpdate(
        { key },
        { key, value, description: `Update setting: ${field}` },
        { upsert: true, new: true }
      );
    }
    return this.load();
  }

  async seedDefaults(): Promise<void> {
    for (const [field, value] of Object.entries(DEFAULTS)) {
      if (value === null) continue;
      const key = KEY_MAP[field as keyof UpdateSettings];
      const existing = await SystemSettings.findOne({ key });
      if (!existing) {
        await SystemSettings.create({ key, value, description: `Update setting: ${field}` });
      }
    }
    await this.load();
  }
}

export const updateSettingsService = new UpdateSettingsService();
