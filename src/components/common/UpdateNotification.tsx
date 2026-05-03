import React from 'react';
import { Modal, Text, Button, Progress, Group, Stack, Alert, Title, Divider, Badge } from '@mantine/core';
import { IconDownload, IconRefresh, IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { useUpdater } from '../../hooks/useUpdater';

interface UpdateNotificationProps {
  opened: boolean;
  onClose: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ opened, onClose }) => {
  const {
    isChecking,
    isUpdateAvailable,
    isDownloading,
    isInstalling,
    error,
    update,
    downloadProgress,
    downloadAndInstall,
    dismissUpdate,
    checkForUpdates,
  } = useUpdater();

  const handleDownload = async () => {
    await downloadAndInstall();
  };

  const handleDismiss = () => {
    dismissUpdate();
    onClose();
  };

  const formatVersion = (version: string) => {
    return version.startsWith('v') ? version : `v${version}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconRefresh size={20} />
          <Title order={4}>Update Available</Title>
        </Group>
      }
      centered
      size="md"
      closeOnClickOutside={!isDownloading && !isInstalling}
      closeOnEscape={!isDownloading && !isInstalling}
    >
      <Stack gap="md" mt={24}>
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Update Error">
            {error}
            <Group mt="sm">
              <Button size="xs" variant="light" onClick={checkForUpdates} loading={isChecking}>
                Retry
              </Button>
            </Group>
          </Alert>
        )}

        {isUpdateAvailable && update && (
          <>
            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Current Version
                </Text>
                <Badge variant="light" color="gray">
                  {formatVersion(update.currentVersion)}
                </Badge>
              </Group>
              <Group justify="space-between" mb="sm">
                <Text size="sm" c="dimmed">
                  New Version
                </Text>
                <Badge variant="light" color="blue">
                  {formatVersion(update.version)}
                </Badge>
              </Group>{' '}
              <Text size="xs" c="dimmed">
                Released: {update.date ? formatDate(update.date) : 'Unknown'}
              </Text>
            </div>

            <Divider />

            <div>
              <Text size="sm" fw={500} mb="xs">
                Release Notes:
              </Text>
              <Text size="sm" c="dimmed">
                {update.body || 'New features and improvements'}
              </Text>
            </div>

            {(isDownloading || isInstalling) && (
              <>
                <Divider />
                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>
                      {isDownloading ? 'Downloading...' : 'Installing...'}
                    </Text>
                    {isDownloading && (
                      <Text size="xs" c="dimmed">
                        {Math.round(downloadProgress)}%
                      </Text>
                    )}
                  </Group>
                  <Progress
                    value={isDownloading ? downloadProgress : 100}
                    animated={isDownloading || isInstalling}
                    color={isInstalling ? 'green' : 'blue'}
                  />
                  {isInstalling && (
                    <Text size="xs" c="dimmed" mt="xs">
                      The app will restart automatically when installation is complete.
                    </Text>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {!isUpdateAvailable && !error && !isChecking && (
          <Alert icon={<IconCheck size={16} />} color="green" title="Up to Date">
            You're running the latest version of Flash Code.
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          {!isDownloading && !isInstalling && (
            <>
              <Button variant="subtle" color="gray" onClick={handleDismiss} leftSection={<IconX size={16} />}>
                {isUpdateAvailable ? 'Skip Update' : 'Close'}
              </Button>
              {isUpdateAvailable && (
                <Button onClick={handleDownload} leftSection={<IconDownload size={16} />} loading={isDownloading}>
                  Download & Install
                </Button>
              )}
              {!isUpdateAvailable && !error && (
                <Button
                  variant="light"
                  onClick={checkForUpdates}
                  loading={isChecking}
                  leftSection={<IconRefresh size={16} />}
                >
                  Check Again
                </Button>
              )}
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
};
