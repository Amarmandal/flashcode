import { notifications } from '@mantine/notifications';
import { storageService } from './storageService';
import { authService } from './authService';

let schedulerIntervalId: number | null = null;
let isCurrentlyRunning = false;

export const backupScheduler = {
  /**
   * Starts the background backup watcher
   */
  start(): void {
    if (schedulerIntervalId !== null) return;

    // Run initial check shortly after startup
    setTimeout(() => {
      this.checkAndExecute();
    }, 10000);

    // Check periodically every 15 minutes
    schedulerIntervalId = window.setInterval(() => {
      this.checkAndExecute();
    }, 15 * 60 * 1000);
  },

  /**
   * Stops the background watcher (e.g. on logout)
   */
  stop(): void {
    if (schedulerIntervalId !== null) {
      clearInterval(schedulerIntervalId);
      schedulerIntervalId = null;
    }
  },

  /**
   * Performs the background auto-backup if due
   */
  async checkAndExecute(): Promise<void> {
    if (isCurrentlyRunning) return;

    const session = authService.getSession();
    if (!session || !authService.isSessionValid(session)) {
      return;
    }

    const config = storageService.getConfig();
    if (!config.autoBackup) return;

    if (storageService.isAutoBackupDue(config)) {
      isCurrentlyRunning = true;
      try {
        const item = await storageService.performBackup(config);
        notifications.show({
          title: 'Cloud Backup Complete',
          message: `Your data was automatically backed up to Google Drive (${item.name}).`,
          color: 'teal',
          autoClose: 4000,
        });
      } catch (err) {
        console.warn('Background auto-backup failed:', err);
      } finally {
        isCurrentlyRunning = false;
      }
    }
  },
};
