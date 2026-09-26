import React, { useState } from 'react';
import {
  Card,
  Text,
  Title,
  Button,
  Group,
  Stack,
  Select,
  Box,
  Badge,
  Paper,
  Center,
  ThemeIcon,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconBrandGoogle,
  IconClock,
  IconShieldLock,
  IconCloudCheck,
  IconArrowRight,
  IconDatabase,
  IconAlertCircle,
} from '@tabler/icons-react';
import AppLogo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';
import classes from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, logoutError, retryLogout } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<string>('90');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingLogout, setIsRetryingLogout] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const durationDays = parseInt(selectedDuration, 10) || 90;

  const handleRetryLogout = async () => {
    setIsRetryingLogout(true);
    try {
      await retryLogout();
    } finally {
      setIsRetryingLogout(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle(durationDays);
      notifications.show({
        title: 'Authentication Successful',
        message: `Signed in with Google. Session active for ${durationDays} days.`,
        color: 'teal',
      });
    } catch (err: unknown) {
      console.error('Google sign-in failed:', err);
      const msg = 'Google sign-in could not be completed. Please try again.';
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
    <Box data-mantine-color-scheme="dark" className={classes.page}>
      <Card
        shadow="xl"
        radius="lg"
        padding="xl"
        withBorder
        className={classes.card}
      >
        <Stack gap="lg">
          {/* Header & Logo */}
          <Center>
            <Stack align="center" gap="xs">
              <AppLogo size="medium" />
              <Title order={2} ta="center" mt="xs" className={classes.title}>
                Welcome to Flashcode
              </Title>
              <Text size="sm" ta="center" className={classes.subtitle}>
                Sign in with Google to associate your data and enable automated cloud backups to Google Drive.
              </Text>
            </Stack>
          </Center>

          {logoutError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Sign-Out Incomplete"
              color="orange"
              variant="light"
              classNames={{
                root: classes.warnAlert,
                title: classes.warnAlertTitle,
                message: classes.warnAlertBody,
                icon: classes.warnAlertIcon,
              }}
            >
              <Stack gap="xs">
                <Text size="xs" className={classes.warnAlertBody}>
                  {logoutError}
                </Text>
                <Group justify="flex-start">
                  <Button
                    size="xs"
                    color="orange"
                    variant="light"
                    className={classes.warnRetryButton}
                    loading={isRetryingLogout}
                    onClick={handleRetryLogout}
                  >
                    Retry
                  </Button>
                </Group>
              </Stack>
            </Alert>
          )}

          {errorMsg && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Sign In Error"
              color="red"
              variant="light"
              withCloseButton
              onClose={() => setErrorMsg(null)}
              classNames={{
                root: classes.errorAlert,
                title: classes.errorAlertTitle,
                message: classes.errorAlertBody,
                icon: classes.errorAlertIcon,
                closeButton: classes.errorAlertClose,
              }}
            >
              <Text size="xs" className={classes.errorAlertBody}>
                {errorMsg}
              </Text>
            </Alert>
          )}

          {/* Session Duration Selector */}
          <Paper
            p="md"
            radius="md"
            withBorder
            className={classes.durationPanel}
          >
            <Stack gap="xs">
              <Group justify="space-between">
                <Group gap={6}>
                  <ThemeIcon
                    size="sm"
                    variant="light"
                    color="blue"
                    className={classes.clockIcon}
                  >
                    <IconClock size={14} />
                  </ThemeIcon>
                  <Text size="xs" fw={600} className={classes.sectionTitle}>
                    Session Duration
                  </Text>
                </Group>
                <Badge
                  size="xs"
                  color="blue"
                  variant="light"
                  className={classes.badge}
                >
                  Configurable
                </Badge>
              </Group>

              <Select
                aria-label="Session Duration"
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
                comboboxProps={{
                  withinPortal: false,
                  transitionProps: { transition: 'pop', duration: 140 },
                }}
                classNames={{
                  input: classes.selectInput,
                  section: classes.selectSection,
                  description: classes.selectDescription,
                  dropdown: classes.selectDropdown,
                  option: classes.selectOption,
                }}
              />
            </Stack>
          </Paper>

          {/* Primary Google Login Button */}
          <Button
            size="md"
            radius="md"
            fullWidth
            variant="default"
            className={classes.googleButton}
            leftSection={<IconBrandGoogle size={20} color="#4285F4" />}
            rightSection={<IconArrowRight size={16} color="#0f172a" />}
            loaderProps={{ color: '#0f172a' }}
            onClick={handleGoogleLogin}
            loading={isSubmitting}
          >
            Sign in with Google
          </Button>

          <Text
            size="xs"
            ta="center"
            role="status"
            aria-live="polite"
            className={classes.statusText}
          >
            {isSubmitting
              ? 'Complete sign-in in your browser, then return to Flashcode.'
              : 'Google sign-in opens securely in your browser.'}
          </Text>

          {/* Features Highlights Footer */}
          <Paper p="xs" radius="md" className={classes.footerPanel}>
            <Group justify="space-around">
              <Tooltip label="Secure session refreshed on your schedule" withArrow>
                <Group gap={6}>
                  <IconShieldLock size={14} color="#69db7c" />
                  <Text size="xs" className={classes.footerText}>
                    {durationDays}-day session
                  </Text>
                </Group>
              </Tooltip>

              <Tooltip label="Automated background sync to Google Drive" withArrow>
                <Group gap={6}>
                  <IconCloudCheck size={14} color="#4dabf7" />
                  <Text size="xs" className={classes.footerText}>
                    Google Drive sync
                  </Text>
                </Group>
              </Tooltip>

              <Tooltip label="Isolated per-user SQLite database" withArrow>
                <Group gap={6}>
                  <IconDatabase size={14} color="#ffd43b" />
                  <Text size="xs" className={classes.footerText}>
                    Private local data
                  </Text>
                </Group>
              </Tooltip>
            </Group>
          </Paper>
        </Stack>
      </Card>
    </Box>
  );
};

