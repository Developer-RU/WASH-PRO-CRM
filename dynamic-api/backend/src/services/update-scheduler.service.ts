import { updateService } from './update.service';
import { updateSettingsService } from './update-settings.service';
import { isNewerVersion } from '../utils/semver';
import { getAppVersion } from './update-settings.service';

class UpdateSchedulerService {
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private autoTimer: ReturnType<typeof setInterval> | null = null;

  async start(): Promise<void> {
    await updateSettingsService.load();
    updateService.processResultFile();
    updateService.processProgressFile();
    await updateService.reconcileStaleJobs();

    this.scheduleChecks();
    setInterval(() => {
      updateService.processResultFile();
      updateService.processProgressFile();
      void updateService.reconcileStaleJobs();
    }, 5000);

    console.log('Update scheduler started');
  }

  private scheduleChecks(): void {
    if (this.checkTimer) clearInterval(this.checkTimer);
    if (this.autoTimer) clearInterval(this.autoTimer);

    const settings = updateSettingsService.getCached();
    if (!settings.checkEnabled) return;

    const checkMs = Math.max(settings.checkIntervalHours, 1) * 60 * 60 * 1000;
    this.checkTimer = setInterval(() => {
      void this.runScheduledCheck();
    }, checkMs);

    // Initial check after 2 minutes (avoid startup noise)
    setTimeout(() => void this.runScheduledCheck(), 2 * 60 * 1000);

    if (settings.autoUpdateEnabled) {
      const autoMs = Math.max(settings.autoUpdateIntervalHours, 1) * 60 * 60 * 1000;
      this.autoTimer = setInterval(() => {
        void this.runAutoUpdate();
      }, autoMs);
    }
  }

  async reloadSchedule(): Promise<void> {
    await updateSettingsService.load();
    this.scheduleChecks();
  }

  private async runScheduledCheck(): Promise<void> {
    const settings = updateSettingsService.getCached();
    if (!settings.checkEnabled) return;

    try {
      await updateService.checkForUpdates(true);
      console.log('Update check completed');
    } catch (err) {
      console.error('Scheduled update check failed:', err);
    }
  }

  private async runAutoUpdate(): Promise<void> {
    const settings = updateSettingsService.getCached();
    if (!settings.autoUpdateEnabled || !settings.checkEnabled) return;

    try {
      const check = await updateService.checkForUpdates(true);
      if (!check.updateAvailable || !check.latestVersion) return;
      if (!isNewerVersion(check.latestVersion, getAppVersion())) return;

      await updateService.startUpdate({ trigger: 'auto' });
      console.log(`Auto-update started for v${check.latestVersion}`);
    } catch (err) {
      console.error('Auto-update failed:', err);
    }
  }
}

export const updateScheduler = new UpdateSchedulerService();
