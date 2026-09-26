export type StorageProviderType = 'google_drive' | 'onedrive' | 'icloud';

export type BackupSyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface CloudBackupItem {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  provider: StorageProviderType;
  description?: string;
}

export interface BackupConfig {
  provider: StorageProviderType;
  autoBackup: boolean;
  backupIntervalHours: number; // e.g. 12, 24, 72, 168
  lastBackupAt: string | null;
  lastBackupStatus: BackupSyncStatus;
  lastBackupError: string | null;
  googleConnected: boolean;
  googleUserEmail?: string;
  googleAccountName?: string;
}
