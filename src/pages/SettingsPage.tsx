import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Avatar,
  Badge,
  Button,
  Select,
  Switch,
  Divider,
  Loader,
  Alert,
  ThemeIcon,
  Box,
} from '@mantine/core';
import {
  IconClock,
  IconCloud,
  IconRefresh,
  IconLogout,
  IconCheck,
  IconAlertCircle,
  IconCloudUpload,
  IconHistory,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { notifications } from '@mantine/notifications';

export const SettingsPage: React.FC = () => {
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

  const [selectedDuration, setSelectedDuration] = useState<string>(
    String(session?.config?.durationDays || 90)
  );
  const [isUpdatingDuration, setIsUpdatingDuration] = useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    setSelectedDuration(String(session?.config?.durationDays || 90));
  }, [session?.config?.durationDays]);

  const handleDurationChange = async (val: string | null) => {
    if (!val) return;
    const days = parseInt(val, 10);
    const previousDuration = String(session?.config?.durationDays || 90);
    setSelectedDuration(val);
    setIsUpdatingDuration(true);
    try {
      await updateSessionDuration(days);
      notifications.show({
        title: 'Session Duration Updated',
        message: `Your session validity is now set to ${days} days.`,
        color: 'teal',
      });
    } catch (err: unknown) {
      setSelectedDuration(previousDuration);
      notifications.show({
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Could not update session duration.',
        color: 'red',
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
    } catch (err: unknown) {
      notifications.show({
        title: 'Refresh Failed',
        message: err instanceof Error ? err.message : 'Could not refresh session.',
        color: 'red',
      });
    } finally {
      setIsRefreshingSession(false);
    }
  };

  const handleLogout = async () => {
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
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Profile &amp; Settings</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Manage your account profile, session duration, and automated Google Drive backups.
          </Text>
        </Box>

        {/* Profile Section */}
        <Paper p="lg" withBorder radius="md">
          <Stack gap="md">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <Avatar
                  src={user?.avatarUrl}
                  alt={user?.name || 'User'}
                  radius="xl"
                  size="lg"
                  color="blue"
                >
                  {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                </Avatar>
                <Box style={{ overflow: 'hidden' }}>
                  <Group gap="xs">
                    <Text fw={600} size="md">
                      {user?.name || 'Flashcode User'}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={user?.provider === 'google' ? 'red' : 'blue'}
                    >
                      {user?.provider === 'google' ? 'Google Account' : 'Account'}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" truncate>
                    {user?.email || 'Authenticated with Google'}
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

            <Divider />

            {/* Session Duration Configuration inside Profile Section */}
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <IconClock size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    Session Duration &amp; Validity
                  </Text>
                </Group>
                <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                  Active ({daysRemaining} days remaining)
                </Badge>
              </Group>

              <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                <Box style={{ flex: 1, minWidth: 240 }}>
                  <Text size="sm" fw={500}>
                    Session Duration
                  </Text>
                  <Text size="xs" c="dimmed">
                    By default, sign-in sessions last 3 months (90 days). You can change how long Flashcode remains unlocked before prompting you to re-authenticate.
                  </Text>
                </Box>
                <Select
                  aria-label="Session Duration"
                  size="sm"
                  w={240}
                  value={selectedDuration}
                  onChange={handleDurationChange}
                  disabled={isUpdatingDuration}
                  data={[
                    { value: '30', label: '1 Month (30 Days)' },
                    { value: '90', label: '3 Months (90 Days — Default)' },
                    { value: '180', label: '6 Months (180 Days)' },
                    { value: '365', label: '1 Year (365 Days)' },
                  ]}
                />
              </Group>

              <Group justify="space-between" mt={4}>
                <Group gap="lg">
                  <Text size="xs" c="dimmed">
                    Signed in: <Text span fw={500} c="var(--text-primary)">{authDateStr}</Text>
                  </Text>
                  <Text size="xs" c="dimmed">
                    Expires: <Text span fw={500} c="var(--text-primary)">{expiresDateStr}</Text>
                  </Text>
                </Group>

                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={isRefreshingSession ? <Loader size={12} /> : <IconRefresh size={14} />}
                  onClick={handleRefreshSession}
                  loading={isRefreshingSession}
                >
                  Extend Session (+{selectedDuration} Days from today)
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Paper>

        {/* Cloud Backup Configuration */}
        <Paper p="lg" withBorder radius="md">
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="blue">
                <IconCloud size={14} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Google Drive Cloud Backup
              </Text>
            </Group>

            <Group justify="space-between">
              <Box>
                <Text size="sm" fw={500}>
                  Automatic Background Backup
                </Text>
                <Text size="xs" c="dimmed">
                  Automatically exports and stores encrypted database snapshots in your Google Drive AppData folder.
                </Text>
              </Box>
              <Switch
                checked={backupConfig.autoBackup}
                onChange={(e) => updateBackupConfig({ autoBackup: e.currentTarget.checked })}
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
                  w={200}
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

            <Divider />

            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Last Backup: <Text span fw={500} c="var(--text-primary)">{lastBackupStr}</Text>
              </Text>
              <Button
                size="xs"
                variant="filled"
                color="blue"
                leftSection={isBackingUp ? <Loader size={12} /> : <IconCloudUpload size={14} />}
                onClick={triggerBackup}
                loading={isBackingUp}
              >
                Backup to Google Drive Now
              </Button>
            </Group>

            {backupsList.length > 0 && (
              <>
                <Divider />
                <Stack gap="xs">
                  <Group gap={6}>
                    <IconHistory size={15} />
                    <Text size="xs" fw={600}>
                      Cloud Snapshots ({backupsList.length})
                    </Text>
                  </Group>
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
              </>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};
