import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { BackupConfig, CloudBackupItem } from '../types/storage';
import { storageService } from '../services/storageService';
import { googleDriveService } from '../services/googleDriveService';
import { authService } from '../services/authService';
import { useAuth } from './AuthContext';

interface StorageContextType {
  backupConfig: BackupConfig;
  isBackingUp: boolean;
  isRestoring: boolean;
  backupsList: CloudBackupItem[];
  triggerBackup: () => Promise<boolean>;
  restoreBackup: (item: CloudBackupItem) => Promise<boolean>;
  updateBackupConfig: (updates: Partial<BackupConfig>) => void;
  refreshBackups: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [backupConfig, setBackupConfig] = useState<BackupConfig>(() => storageService.getConfig());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupsList, setBackupsList] = useState<CloudBackupItem[]>([]);

  const refreshBackups = useCallback(async () => {
    try {
      const accessToken = await authService.getSecureAccessToken();
      if (!accessToken) return;
      const items = await googleDriveService.listBackups(accessToken);
      setBackupsList(items);
    } catch (err) {
      console.warn('Failed to refresh cloud backups list:', err);
    }
  }, []);

  // Load backups when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshBackups();
    }
  }, [isAuthenticated, refreshBackups]);

  const updateBackupConfig = useCallback((updates: Partial<BackupConfig>) => {
    setBackupConfig((prev) => {
      const next = { ...prev, ...updates };
      storageService.saveConfig(next);
      return next;
    });
  }, []);

  const triggerBackup = useCallback(async (): Promise<boolean> => {
    setIsBackingUp(true);
    try {
      const item = await storageService.performBackup(backupConfig);
      setBackupConfig(storageService.getConfig());
      await refreshBackups();

      notifications.show({
        title: 'Backup Successful',
        message: `Your data was successfully backed up to Google Drive (${item.name})`,
        color: 'teal',
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to backup database';
      notifications.show({
        title: 'Backup Failed',
        message: msg,
        color: 'red',
      });
      return false;
    } finally {
      setIsBackingUp(false);
    }
  }, [backupConfig, refreshBackups]);

  const restoreBackup = useCallback(
    async (item: CloudBackupItem): Promise<boolean> => {
      setIsRestoring(true);
      try {
        await storageService.restoreFromCloudBackup(item);
        notifications.show({
          title: 'Restore Completed',
          message: `Database restored from ${item.name}. Reloading data...`,
          color: 'teal',
        });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to restore database';
        notifications.show({
          title: 'Restore Failed',
          message: msg,
          color: 'red',
        });
        return false;
      } finally {
        setIsRestoring(false);
      }
    },
    []
  );

  return (
    <StorageContext.Provider
      value={{
        backupConfig,
        isBackingUp,
        isRestoring,
        backupsList,
        triggerBackup,
        restoreBackup,
        updateBackupConfig,
        refreshBackups,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
