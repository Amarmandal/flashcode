import React, { useState } from 'react';
import {
  Card,
  Text,
  Title,
  Button,
  Group,
  Stack,
  TextInput,
  Select,
  Box,
  Badge,
  Paper,
  Center,
  ThemeIcon,
  Tooltip,
  Alert,
  Modal,
} from '@mantine/core';
import {
  IconBrandGoogle,
  IconClock,
  IconShieldLock,
  IconCloudCheck,
  IconArrowRight,
  IconDatabase,
  IconSettings,
  IconAlertCircle,
  IconKey,
} from '@tabler/icons-react';
import AppLogo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';

const CLIENT_ID_STORAGE_KEY = 'flashcode_google_client_id';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<string>('90');
  const [clientId, setClientId] = useState<string>(() => {
    return (
      localStorage.getItem(CLIENT_ID_STORAGE_KEY) ||
      // Standard demo/default client ID if configured
      ''
    );
  });
  const [configModalOpened, setConfigModalOpened] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const durationDays = parseInt(selectedDuration, 10) || 90;

  const handleSaveClientId = (val: string) => {
    setClientId(val);
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, val);
  };

  const handleGoogleLogin = async () => {
    if (!clientId.trim()) {
      setConfigModalOpened(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle(clientId.trim(), durationDays);
      notifications.show({
        title: 'Authentication Successful',
        message: `Signed in with Google. Session active for ${durationDays} days.`,
        color: 'teal',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth failed';
      setErrorMsg(msg);
      notifications.show({
        title: 'Authentication Failed',
        message: msg,
        color: 'red',
        autoClose: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at top, var(--mantine-color-blue-9), var(--mantine-color-dark-9), #0a0b0e)',
        padding: '2rem 1rem',
      }}
    >
      <Card
        shadow="xl"
        radius="lg"
        padding="xl"
        withBorder
        style={{
          width: '100%',
          maxWidth: 480,
          backdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(26, 27, 30, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <Stack gap="lg">
          {/* Header & Logo */}
          <Center>
            <Stack align="center" gap="xs">
              <AppLogo size="medium" />
              <Title order={2} ta="center" mt="xs">
                Welcome to Flashcode
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Sign in with Google to associate your data and enable automated cloud backups to Google Drive.
              </Text>
            </Stack>
          </Center>

          {errorMsg && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Sign In Error"
              color="red"
              variant="light"
              withCloseButton
              onClose={() => setErrorMsg(null)}
            >
              <Text size="xs">{errorMsg}</Text>
            </Alert>
          )}

          {/* Session Duration Selector */}
          <Paper
            p="md"
            radius="md"
            withBorder
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between">
                <Group gap={6}>
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <IconClock size={14} />
                  </ThemeIcon>
                  <Text size="xs" fw={600}>
                    Session Duration
                  </Text>
                </Group>
                <Badge size="xs" color="blue" variant="light">
                  Configurable
                </Badge>
              </Group>

              <Select
                value={selectedDuration}
                onChange={(val) => setSelectedDuration(val || '90')}
                data={[
                  { value: '30', label: '30 Days (1 Month)' },
                  { value: '90', label: '90 Days (Recommended — 3 Months)' },
                  { value: '180', label: '180 Days (6 Months)' },
                  { value: '365', label: '365 Days (1 Year)' },
                ]}
                description="After this duration expires, you will be prompted to re-authenticate."
                size="sm"
              />
            </Stack>
          </Paper>

          {/* Primary Google Login Button */}
          <Button
            size="md"
            radius="md"
            fullWidth
            color="dark"
            variant="default"
            leftSection={<IconBrandGoogle size={20} color="#4285F4" />}
            rightSection={<IconArrowRight size={16} />}
            onClick={handleGoogleLogin}
            loading={isSubmitting}
            style={{
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            Sign in with Google
          </Button>

          {/* Client ID Configuration Prompt */}
          <Group justify="center">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconSettings size={14} />}
              onClick={() => setConfigModalOpened(true)}
            >
              {clientId ? 'Google OAuth configured' : 'Configure Google Client ID'}
            </Button>
          </Group>

          {/* Features Highlights Footer */}
          <Paper
            p="xs"
            radius="md"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <Group justify="space-around">
              <Tooltip label="Secure session refreshed on your schedule" withArrow>
                <Group gap={6}>
                  <IconShieldLock size={14} color="#69db7c" />
                  <Text size="xs" c="dimmed">
                    {durationDays}-day session
                  </Text>
                </Group>
              </Tooltip>

              <Tooltip label="Automated background sync to Google Drive" withArrow>
                <Group gap={6}>
                  <IconCloudCheck size={14} color="#4dabf7" />
                  <Text size="xs" c="dimmed">
                    Google Drive sync
                  </Text>
                </Group>
              </Tooltip>

              <Tooltip label="Isolated per-user SQLite database" withArrow>
                <Group gap={6}>
                  <IconDatabase size={14} color="#ffd43b" />
                  <Text size="xs" c="dimmed">
                    Isolated DB
                  </Text>
                </Group>
              </Tooltip>
            </Group>
          </Paper>
        </Stack>
      </Card>

      {/* Google OAuth Client ID Configuration Modal */}
      <Modal
        opened={configModalOpened}
        onClose={() => setConfigModalOpened(false)}
        title={
          <Group gap="xs">
            <IconKey size={18} color="var(--mantine-color-blue-4)" />
            <Text fw={600} size="sm">
              Google OAuth Configuration
            </Text>
          </Group>
        }
        size="md"
        radius="md"
      >
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            To authenticate with Google and enable Google Drive backups, enter your Google Cloud
            OAuth 2.0 Client ID (Application type: <b>Desktop app</b>).
          </Text>

          <TextInput
            label="OAuth 2.0 Client ID"
            placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
            size="sm"
            value={clientId}
            onChange={(e) => handleSaveClientId(e.currentTarget.value)}
          />

          <Alert color="blue" variant="light" p="xs">
            <Text size="10px">
              Flashcode uses the PKCE flow directly with a local loopback server (RFC 8252). No
              client secret is required. Tokens are stored securely in your OS Keychain.
            </Text>
          </Alert>

          <Button
            size="xs"
            color="blue"
            fullWidth
            onClick={() => {
              setConfigModalOpened(false);
              if (clientId.trim()) {
                handleGoogleLogin();
              }
            }}
          >
            Save & Continue to Google
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
};
