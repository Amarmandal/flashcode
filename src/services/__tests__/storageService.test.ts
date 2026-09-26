// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../storageService';
import { BackupConfig } from '../../types/storage';

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads default backup configuration', () => {
    const config = storageService.getConfig();
    expect(config.provider).toBe('google_drive');
    expect(config.autoBackup).toBe(true);
    expect(config.backupIntervalHours).toBe(24);
  });

  it('saves and updates backup configuration', () => {
    const customConfig: BackupConfig = {
      provider: 'google_drive',
      autoBackup: true,
      backupIntervalHours: 12,
      lastBackupAt: new Date().toISOString(),
      lastBackupStatus: 'success',
      lastBackupError: null,
      googleConnected: true,
    };

    storageService.saveConfig(customConfig);
    const loaded = storageService.getConfig();
    expect(loaded.backupIntervalHours).toBe(12);
    expect(loaded.googleConnected).toBe(true);
  });

  it('correctly calculates whether auto-backup is due', () => {
    const config = storageService.getConfig();
    // No last backup: auto backup is due
    expect(storageService.isAutoBackupDue(config)).toBe(true);

    // Recent backup 1 hour ago (with 24h interval): not due
    config.lastBackupAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(storageService.isAutoBackupDue(config)).toBe(false);

    // Old backup 25 hours ago (with 24h interval): due
    config.lastBackupAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(storageService.isAutoBackupDue(config)).toBe(true);
  });
});
