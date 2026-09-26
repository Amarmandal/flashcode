import { invoke } from '@tauri-apps/api/core';
import { BackupConfig, CloudBackupItem } from '../types/storage';
import { googleDriveService } from './googleDriveService';
import { authService } from './authService';
import { SuccessApiResponse } from '../types/successApiResponse';

const BACKUP_CONFIG_KEY = 'flashcode_backup_config';

const DEFAULT_CONFIG: BackupConfig = {
  provider: 'google_drive',
  autoBackup: true,
  backupIntervalHours: 24,
  lastBackupAt: null,
  lastBackupStatus: 'idle',
  lastBackupError: null,
  googleConnected: false,
};

export const storageService = {
  getConfig(): BackupConfig {
    try {
      const data = localStorage.getItem(BACKUP_CONFIG_KEY);
      if (!data) return { ...DEFAULT_CONFIG };
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  },

  saveConfig(config: BackupConfig): void {
    try {
      localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save backup config:', err);
    }
  },

  /**
   * Generates a transaction-safe SQLite snapshot via Rust SQLite Online Backup API
   */
  async getDatabaseBytes(): Promise<Uint8Array> {
    const res = await invoke<SuccessApiResponse<number[]>>('read_database_backup_bytes');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to read SQLite snapshot from Tauri backend');
    }
    return new Uint8Array(res.data);
  },

  /**
   * Restores SQLite database safely under lock, replacing open connections cleanly
   */
  async restoreDatabaseBytes(bytes: Uint8Array): Promise<string> {
    if (!bytes || bytes.length === 0) {
      throw new Error('Cannot restore empty database snapshot');
    }

    const numberArray = Array.from(bytes);
    const res = await invoke<SuccessApiResponse<string>>('import_database_backup_bytes', {
      bytes: numberArray,
    });
    if (!res.success) {
      throw new Error(res.message || 'Failed to import database bytes in Tauri backend');
    }
    return res.data || 'Database restored successfully';
  },

  /**
   * Performs real cloud backup to Google Drive
   */
  async performBackup(config?: BackupConfig): Promise<CloudBackupItem> {
    const currentConfig = config || this.getConfig();
    const session = authService.getSession();

    if (!session || !authService.isSessionValid(session)) {
      throw new Error('Cannot backup: Active user session is required.');
    }

    const accessToken = await authService.getSecureAccessToken();
    if (!accessToken) {
      throw new Error('Google Drive access token not found in OS Keychain. Please re-authenticate.');
    }

    currentConfig.lastBackupStatus = 'syncing';
    currentConfig.lastBackupError = null;
    this.saveConfig(currentConfig);

    try {
      const bytes = await this.getDatabaseBytes();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const userPrefix = session.user.email ? session.user.email.split('@')[0] : 'user';
      const fileName = `flashcodes-${userPrefix}-${timestamp}.db`;

      const uploadedItem = await googleDriveService.uploadBackup(bytes, fileName, accessToken);

      currentConfig.lastBackupAt = new Date().toISOString();
      currentConfig.lastBackupStatus = 'success';
      currentConfig.lastBackupError = null;
      this.saveConfig(currentConfig);

      return uploadedItem;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown backup error';
      currentConfig.lastBackupStatus = 'error';
      currentConfig.lastBackupError = errorMsg;
      this.saveConfig(currentConfig);
      throw err;
    }
  },

  /**
   * Downloads and restores a real cloud backup from Google Drive
   */
  async restoreFromCloudBackup(backupItem: CloudBackupItem): Promise<boolean> {
    const accessToken = await authService.getSecureAccessToken();
    if (!accessToken) {
      throw new Error('Google Drive access token not found in OS Keychain. Please re-authenticate.');
    }

    const bytes = await googleDriveService.downloadBackup(backupItem.id, accessToken);
    if (!bytes || bytes.length === 0) {
      throw new Error('Cloud backup download was empty or failed.');
    }

    await this.restoreDatabaseBytes(bytes);
    return true;
  },

  isAutoBackupDue(config: BackupConfig): boolean {
    if (!config.autoBackup) return false;
    if (!config.lastBackupAt) return true;

    const lastTime = new Date(config.lastBackupAt).getTime();
    const now = Date.now();
    const intervalMs = config.backupIntervalHours * 60 * 60 * 1000;

    return now - lastTime >= intervalMs;
  },
};
