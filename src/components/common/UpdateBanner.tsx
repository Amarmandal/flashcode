import React from 'react';
import { Notification, Button, Group } from '@mantine/core';
import { IconDownload, IconRefresh } from '@tabler/icons-react';

interface UpdateBannerProps {
  version: string;
  onDownload: () => void;
  onDismiss: () => void;
  isDownloading?: boolean;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  version,
  onDownload,
  onDismiss,
  isDownloading = false,
}) => {
  return (
    <Notification
      icon={<IconRefresh size={20} />}
      color="blue"
      title="Update Available"
      onClose={onDismiss}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        minWidth: 350,
        maxWidth: 400,
      }}
    >
      <div>
        <div style={{ marginBottom: 8 }}>
          Flash Code {version} is ready to install!
        </div>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={onDownload}
            loading={isDownloading}
            leftSection={<IconDownload size={14} />}
          >
            Download & Install
          </Button>
        </Group>
      </div>
    </Notification>
  );
};
