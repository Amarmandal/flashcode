import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Stack,
  Group,
  Avatar,
  Text,
  Badge,
  Button,
  Select,
  Switch,
  Paper,
  Divider,
  Loader,
  Alert,
  ThemeIcon,
  Box,
} from '@mantine/core';
import {
  IconUser,
  IconClock,
  IconCloud,
  IconBrandGoogle,
  IconRefresh,
  IconLogout,
  IconCheck,
  IconAlertCircle,
  IconCloudUpload,
  IconHistory,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { useStorage } from '../../context/StorageContext';
import { notifications } from '@mantine/notifications';

interface AccountSettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  opened,
  onClose,
}) => {
  const { session, user, daysRemaining, updateSessionDuration, refreshSession, logout } =
    useAuth();
  const {
    backupConfig,
    isBackingUp,
    isRestoring,
    backupsList,
    triggerBackup,
    restoreBackup,
    updateBackupConfig,
  } = useStorage();

  const [activeTab, setActiveTab] = useState<string | null>('session');
  const [selectedDuration, setSelectedDuration] = useState<string>(
    String(session?.config?.durationDays || 90)
  );
  const [isUpdatingDuration, setIsUpdatingDuration] = useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleDurationChange = async (val: string | null) => {
    if (!val) return;
    const days = parseInt(val, 10);
    setSelectedDuration(val);
    setIsUpdatingDuration(true);
    try {
      await updateSessionDuration(days);
      notifications.show({
        title: 'Session Duration Updated',
        message: `Your session will now remain valid for ${days} days.`,
        color: 'teal',
      });
    } finally {
      setIsUpdatingDuration(false);
    }
  };

  const handleRefreshSession = async () => {
    setIsRefreshingSession(true);
    try {
      await refreshSession();
      notifications.show({
        title: 'Session Extended',
        message: `Session refreshed! You now have a full ${session?.config?.durationDays || 90} days remaining.`,
        color: 'teal',
      });
    } finally {
      setIsRefreshingSession(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
      notifications.show({
        title: 'Signed Out',
        message: 'You have been signed out of Flashcode.',
        color: 'blue',
      });
    } catch {
      notifications.show({
        title: 'Sign-Out Incomplete',
        message: 'Sign-out could not be completed. Please retry.',
        color: 'red',
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const expiresDateStr = session?.config?.expiresAt
    ? new Date(session.config.expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  const authDateStr = session?.config?.authenticatedAt
    ? new Date(session.config.authenticatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  const lastBackupStr = backupConfig.lastBackupAt
    ? new Date(backupConfig.lastBackupAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Never';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconUser size={20} color="var(--mantine-color-blue-4)" />
          <Text fw={600} size="md">
            Account & Backup Storage
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
    >
      <Stack gap="md">
        {/* User Card */}
        <Paper p="sm" withBorder radius="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Avatar
                src={user?.avatarUrl}
                alt={user?.name || 'User'}
                radius="xl"
                size="md"
                color="blue"
              >
                {user?.name?.slice(0, 2).toUpperCase() || 'U'}
              </Avatar>
              <Box style={{ overflow: 'hidden' }}>
                <Group gap="xs">
                  <Text fw={600} size="sm">
                    {user?.name || 'Flashcode User'}
                  </Text>
                  <Badge size="xs" variant="light" color={user?.provider === 'google' ? 'red' : 'blue'}>
                    {user?.provider === 'google' ? 'Google' : 'Account'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" truncate>
                  {user?.email || 'No email attached'}
                </Text>
              </Box>
            </Group>

            <Button
              variant="subtle"
              color="red"
              size="xs"
              leftSection={<IconLogout size={14} />}
              onClick={() => setConfirmLogout(true)}
            >
              Sign Out
            </Button>
          </Group>
        </Paper>

        {confirmLogout && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Sign out of Flashcode?"
            color="red"
            variant="light"
          >
            <Text size="xs" mb="xs">
              Signing out will lock the application until you sign in again. All local data is preserved.
            </Text>
            <Group gap="xs">
              <Button size="xs" color="red" onClick={handleLogout}>
                Confirm Sign Out
              </Button>
              <Button size="xs" variant="default" onClick={() => setConfirmLogout(false)}>
                Cancel
              </Button>
            </Group>
          </Alert>
        )}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="session" leftSection={<IconClock size={16} />}>
              Session Management
            </Tabs.Tab>
            <Tabs.Tab value="backup" leftSection={<IconCloud size={16} />}>
              Google Drive Backup
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: SESSION */}
          <Tabs.Panel value="session" pt="md">
            <Stack gap="md">
              <Paper p="md" withBorder radius="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      Session Status
                    </Text>
                    <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                      Active ({daysRemaining} days left)
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Logged in:
                    </Text>
                    <Text size="xs" fw={500}>
                      {authDateStr}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Session expires:
                    </Text>
                    <Text size="xs" fw={500}>
                      {expiresDateStr}
                    </Text>
                  </Group>

                  <Divider my={4} />

                  <Group justify="space-between" align="flex-start">
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        Session Validity Duration
                      </Text>
                      <Text size="xs" c="dimmed">
                        Configures how long Flashcode remains unlocked before requesting re-authentication.
                      </Text>
                    </Box>
                    <Select
                      size="xs"
                      w={180}
                      value={selectedDuration}
                      onChange={handleDurationChange}
                      disabled={isUpdatingDuration}
                      data={[
                        { value: '30', label: '30 Days (1 Month)' },
                        { value: '90', label: '90 Days (Recommended)' },
                        { value: '180', label: '180 Days (6 Months)' },
                        { value: '365', label: '365 Days (1 Year)' },
                      ]}
                    />
                  </Group>

                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    leftSection={isRefreshingSession ? <Loader size={12} /> : <IconRefresh size={14} />}
                    onClick={handleRefreshSession}
                    loading={isRefreshingSession}
                    mt="xs"
                  >
                    Refresh Session (+{selectedDuration} Days from today)
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* TAB 2: CLOUD BACKUP */}
          <Tabs.Panel value="backup" pt="md">
            <Stack gap="md">
              {/* Storage Provider Selector */}
              <Paper p="md" withBorder radius="md">
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    Storage Service Provider
                  </Text>
                  <Group gap="sm">
                    <Paper
                      p="xs"
                      withBorder
                      radius="md"
                      style={{
                        flex: 1,
                        cursor: 'pointer',
                        borderColor:
                          backupConfig.provider === 'google_drive'
                            ? 'var(--mantine-color-blue-5)'
                            : undefined,
                        backgroundColor:
                          backupConfig.provider === 'google_drive'
                            ? 'rgba(34, 139, 230, 0.08)'
                            : undefined,
                      }}
                      onClick={() => updateBackupConfig({ provider: 'google_drive' })}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs">
                          <ThemeIcon size="md" variant="light" color="blue">
                            <IconBrandGoogle size={18} />
                          </ThemeIcon>
                          <Box>
                            <Text size="xs" fw={600}>
                              Google Drive
                            </Text>
                            <Text size="10px" c="dimmed">
                              AppData Folder Sync
                            </Text>
                          </Box>
                        </Group>
                        <Badge size="xs" color="teal" variant="dot">
                          Connected
                        </Badge>
                      </Group>
                    </Paper>

                    <Paper
                      p="xs"
                      withBorder
                      radius="md"
                      style={{
                        flex: 1,
                        opacity: 0.6,
                        cursor: 'not-allowed',
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs">
                          <ThemeIcon size="md" variant="light" color="gray">
                            <IconCloud size={18} />
                          </ThemeIcon>
                          <Box>
                            <Text size="xs" fw={600}>
                              OneDrive / iCloud
                            </Text>
                            <Text size="10px" c="dimmed">
                              Cloud Provider
                            </Text>
                          </Box>
                        </Group>
                        <Badge size="xs" color="gray" variant="light">
                          Soon
                        </Badge>
                      </Group>
                    </Paper>
                  </Group>
                </Stack>
              </Paper>

              {/* Automatic Background Backup Configuration */}
              <Paper p="md" withBorder radius="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" fw={600}>
                        Background Cloud Backup
                      </Text>
                      <Text size="xs" c="dimmed">
                        Automatically exports and stores snapshots in your connected Google Drive.
                      </Text>
                    </Box>
                    <Switch
                      checked={backupConfig.autoBackup}
                      onChange={(e) =>
                        updateBackupConfig({ autoBackup: e.currentTarget.checked })
                      }
                      size="sm"
                    />
                  </Group>

                  {backupConfig.autoBackup && (
                    <Group justify="space-between" align="center">
                      <Text size="xs" c="dimmed">
                        Backup Frequency:
                      </Text>
                      <Select
                        size="xs"
                        w={180}
                        value={String(backupConfig.backupIntervalHours)}
                        onChange={(val) =>
                          updateBackupConfig({
                            backupIntervalHours: parseInt(val || '24', 10),
                          })
                        }
                        data={[
                          { value: '12', label: 'Every 12 Hours' },
                          { value: '24', label: 'Every 24 Hours (Daily)' },
                          { value: '72', label: 'Every 3 Days' },
                          { value: '168', label: 'Weekly' },
                        ]}
                      />
                    </Group>
                  )}

                  <Divider my={4} />

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Last Backup:
                    </Text>
                    <Text size="xs" fw={500}>
                      {lastBackupStr}
                    </Text>
                  </Group>

                  <Button
                    size="sm"
                    variant="filled"
                    color="blue"
                    leftSection={isBackingUp ? <Loader size={14} /> : <IconCloudUpload size={16} />}
                    onClick={triggerBackup}
                    loading={isBackingUp}
                  >
                    Backup to Google Drive Now
                  </Button>
                </Stack>
              </Paper>

              {/* Backups List */}
              <Paper p="sm" withBorder radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap={6}>
                    <IconHistory size={16} />
                    <Text size="xs" fw={600}>
                      Cloud Snapshots
                    </Text>
                  </Group>
                  <Text size="10px" c="dimmed">
                    {backupsList.length} stored in Google Drive
                  </Text>
                </Group>

                {backupsList.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="sm">
                    No cloud snapshots found yet. Click &quot;Backup to Google Drive Now&quot; above to create one.
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {backupsList.map((item) => (
                      <Paper key={item.id} p="xs" withBorder radius="sm">
                        <Group justify="space-between" wrap="nowrap">
                          <Box style={{ overflow: 'hidden' }}>
                            <Text size="xs" fw={500} truncate>
                              {item.name}
                            </Text>
                            <Text size="10px" c="dimmed">
                              {new Date(item.createdAt).toLocaleString()} &bull; {formatBytes(item.sizeBytes)}
                            </Text>
                          </Box>
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="teal"
                            onClick={() => restoreBackup(item)}
                            loading={isRestoring}
                          >
                            Restore
                          </Button>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Modal>
  );
};
