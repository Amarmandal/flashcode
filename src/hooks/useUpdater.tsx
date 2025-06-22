import { useState, useEffect, useCallback } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateState {
  isChecking: boolean;
  isUpdateAvailable: boolean;
  isDownloading: boolean;
  isInstalling: boolean;
  error: string | null;
  update: Update | null;
  downloadProgress: number;
}

export const useUpdater = () => {
  const [state, setState] = useState<UpdateState>({
    isChecking: false,
    isUpdateAvailable: false,
    isDownloading: false,
    isInstalling: false,
    error: null,
    update: null,
    downloadProgress: 0,
  });

  const checkForUpdates = useCallback(async () => {
    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const update = await check();

      if (update?.available) {
        setState((prev) => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: true,
          update,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check for updates',
      }));
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!state.update) return;

    setState((prev) => ({ ...prev, isDownloading: true, error: null }));

    try {
      // Start download with progress tracking
      await state.update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            console.log('Download started');
            setState((prev) => ({ ...prev, downloadProgress: 0 }));
            break;
          case 'Progress':
            const progress = event.data.chunkLength || 0;
            setState((prev) => ({
              ...prev,
              downloadProgress: Math.min(progress, 100),
            }));
            break;
          case 'Finished':
            setState((prev) => ({
              ...prev,
              isDownloading: false,
              isInstalling: true,
              downloadProgress: 100,
            }));
            break;
        }
      });

      console.log('Update downloaded and installed');

      // Relaunch the app
      await relaunch();
    } catch (error) {
      console.log('Error during download and install:', error);
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        isInstalling: false,
        error: error instanceof Error ? error.message : 'Failed to download and install update',
      }));
    }
  }, [state.update]);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isUpdateAvailable: false,
      update: null,
      error: null,
    }));
  }, []);

  // Auto-check for updates on component mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
  };
};
