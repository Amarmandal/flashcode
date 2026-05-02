import { Modal, Stack, Text, Button, Group } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { save, open } from '@tauri-apps/plugin-dialog';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { SuccessApiResponse } from '../../types/successApiResponse';

export function BackupRestore() {
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [selectedImportPath, setSelectedImportPath] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Listen to menu events
  useEffect(() => {
    const unlistenExport = listen('menu://export-backup', () => {
      handleExportBackup();
    });

    const unlistenImport = listen('menu://import-backup', () => {
      handleSelectImportFile();
    });

    return () => {
      unlistenExport.then((fn) => fn());
      unlistenImport.then((fn) => fn());
    };
  }, []);

  const handleExportBackup = async () => {
    try {
      setIsProcessing(true);

      // Get suggested filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFilename = `flashcodes-backup-${timestamp}.db`;

      // Open save dialog
      const destinationPath = await save({
        defaultPath: defaultFilename,
        filters: [
          {
            name: 'Database Backup',
            extensions: ['db'],
          },
        ],
      });

      if (!destinationPath) {
        setIsProcessing(false);
        return; // User cancelled
      }

      // Export backup
      const response = await invoke<SuccessApiResponse<string>>('export_database_backup', {
        destinationPath,
      });

      if (response.success) {
        notifications.show({
          title: 'Backup Created',
          message: 'Database backup exported successfully!',
          color: 'teal',
        });
      } else {
        notifications.show({
          title: 'Export Failed',
          message: response.message || 'Failed to export backup',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      notifications.show({
        title: 'Export Failed',
        message: 'An error occurred while exporting the backup',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectImportFile = async () => {
    try {
      const selectedFile = await open({
        multiple: false,
        filters: [
          {
            name: 'Database Backup',
            extensions: ['db'],
          },
        ],
      });

      if (selectedFile) {
        setSelectedImportPath(selectedFile as string);
        setImportConfirmOpen(true);
      }
    } catch (error) {
      console.error('File selection error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to open file dialog',
        color: 'red',
      });
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedImportPath) return;

    try {
      setIsProcessing(true);

      const response = await invoke<SuccessApiResponse<string>>('import_database_backup', {
        sourcePath: selectedImportPath,
      });

      if (response.success) {
        notifications.show({
          title: 'Import Successful',
          message: 'Database imported. Please restart the application to see changes.',
          color: 'teal',
          autoClose: false,
        });
        setImportConfirmOpen(false);
      } else {
        notifications.show({
          title: 'Import Failed',
          message: response.message || 'Failed to import backup',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      notifications.show({
        title: 'Import Failed',
        message: 'An error occurred while importing the backup',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
      setSelectedImportPath(null);
    }
  };

  return (
    <>
      {/* Import Confirmation Modal */}
      <Modal
        opened={importConfirmOpen}
        onClose={() => {
          if (!isProcessing) {
            setImportConfirmOpen(false);
            setSelectedImportPath(null);
          }
        }}
        title="Confirm Import"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to import this backup? Your current database will be backed up
            automatically before importing.
          </Text>
          <Text size="sm" c="dimmed">
            File: {selectedImportPath?.split('/').pop()}
          </Text>
          <Text size="sm" c="orange" fw={500}>
            ⚠️ You will need to restart the application after importing.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setImportConfirmOpen(false);
                setSelectedImportPath(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="blue"
              onClick={handleConfirmImport}
              loading={isProcessing}
            >
              Import
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
