import { AppShell, Burger, Divider, Flex, NavLink, Loader, Text, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import classes from './Layout.module.css';
import AppLogo from './Logo';
import { IconCards, IconHeart, IconDatabaseSearch, IconRefresh, IconCode, IconBrain, IconQuestionMark } from '@tabler/icons-react';
import { SearchBar } from '../search/SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { UpdateBanner } from './UpdateBanner';
import { UpdateNotification } from './UpdateNotification';
import { BackupRestore } from '../backup/BackupRestore';
import { useUpdater } from '../../hooks/useUpdater';
import { useState } from 'react';

const STUDY_ROUTES = ['/study-now', '/study'];

const Layout = () => {
  const [opened, { toggle }] = useDisclosure();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const location = useLocation();
  const isStudyMode = STUDY_ROUTES.some((r) => location.pathname.endsWith(r));
    const {
    isUpdateAvailable,
    isDownloading,
    isChecking,
    update,
    checkForUpdates,
    dismissUpdate,
  } = useUpdater();

  const handleManualUpdateCheck = () => {
    checkForUpdates();
    setShowUpdateModal(true);
  };const handleUpdateClick = () => {
    setShowUpdateModal(true);
  };

  const handleDismissUpdate = () => {
    dismissUpdate();
  };

  return (
    <>
      {/* Update Banner */}
      {isUpdateAvailable && update && (
        <UpdateBanner
          version={update.version}
          onDownload={handleUpdateClick}
          onDismiss={handleDismissUpdate}
          isDownloading={isDownloading}
        />
      )}

      {/* Update Modal */}
      <UpdateNotification
        opened={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
      />      <AppShell
        header={{ height: 64 }}
        navbar={{
          width: 220,
          breakpoint: 'sm',
          collapsed: { mobile: !opened, desktop: isStudyMode },
        }}
        padding="lg"
        styles={{
          header: {
            backgroundColor: 'transparent',
            borderBottom: 'none',
          },
          navbar: {
            backgroundColor: 'var(--sidebar-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRight: '1px solid var(--sidebar-divider)',
          },
          main: {
            backgroundColor: 'var(--page-bg)',
          },
        }}
      >
        <AppShell.Header>
          <Flex align="center" justify="space-between" h="100%" px="xl" gap="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <AppLogo size="medium" />
            <Flex align="center" gap="md" style={{ flex: 1, justifyContent: 'flex-end' }}>
              {!isStudyMode && <SearchBar />}
              <ThemeToggle />
            </Flex>
            <BackupRestore />
          </Flex>
        </AppShell.Header>

        <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
          <Box mb="lg" mt="xs">
            <AppLogo size="small" />
            <Text size="xs" c="var(--sidebar-text-dim)" mt="xs" style={{ letterSpacing: '0.5px', lineHeight: 1.4 }}>
              Learn by repetition
            </Text>
          </Box>

          <Box style={{ flex: 1 }}>
            <Text
              size="xs"
              fw={600}
              tt="uppercase"
              c="var(--sidebar-text-dim)"
              mb="sm"
              style={{ letterSpacing: '1px' }}
            >
              Main
            </Text>
            <NavLink
              className={classes.navLabel}
              label="Code Deck"
              leftSection={<IconCards size={18} strokeWidth={2} />}
              component={Link}
              to="/"
              active={location.pathname === '/' || location.pathname.startsWith('/deck')}
              styles={{
                root: {
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: 'var(--sidebar-text)',
                },
                label: {
                  color: 'var(--sidebar-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                section: {
                  color: 'var(--sidebar-text)',
                },
              }}
            />
            <NavLink
              className={classes.navLabel}
              label="Normal Deck"
              leftSection={<IconBrain size={18} strokeWidth={2} />}
              component={Link}
              to="/normal-deck"
              active={location.pathname.startsWith('/normal-deck')}
              styles={{
                root: {
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: 'var(--sidebar-text)',
                },
                label: {
                  color: 'var(--sidebar-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                section: {
                  color: 'var(--sidebar-text)',
                },
              }}
            />
            <NavLink
              className={classes.navLabel}
              label="Quiz"
              leftSection={<IconQuestionMark size={18} strokeWidth={2} />}
              component={Link}
              to="/quiz"
              active={location.pathname.startsWith('/quiz')}
              styles={{
                root: {
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: 'var(--sidebar-text)',
                },
                label: {
                  color: 'var(--sidebar-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                section: {
                  color: 'var(--sidebar-text)',
                },
              }}
            />

            <Text
              size="xs"
              fw={600}
              tt="uppercase"
              c="var(--sidebar-text-dim)"
              mt="xl"
              mb="sm"
              style={{ letterSpacing: '1px' }}
            >
              Explore
            </Text>
            <NavLink
              className={classes.navLabel}
              label="Favorite"
              leftSection={<IconHeart size={18} strokeWidth={2} />}
              component={Link}
              to="/favorite"
              active={location.pathname === '/favorite'}
              styles={{
                root: {
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: 'var(--sidebar-text)',
                },
                label: {
                  color: 'var(--sidebar-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                section: {
                  color: 'var(--sidebar-text)',
                },
              }}
            />
            <NavLink
              className={classes.navLabel}
              label="Browse"
              leftSection={<IconDatabaseSearch size={18} strokeWidth={2} />}
              component={Link}
              to="/browse"
              active={location.pathname === '/browse'}
              styles={{
                root: {
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: 'var(--sidebar-text)',
                },
                label: {
                  color: 'var(--sidebar-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                section: {
                  color: 'var(--sidebar-text)',
                },
              }}
            />
            <NavLink
              className={classes.navLabel}
              label="Library"
              leftSection={<IconCode size={18} strokeWidth={2} />}
              component={Link}
              to="/library"
              active={location.pathname === '/library'}
              styles={{
                root: {
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: 'var(--sidebar-text)',
                },
                label: {
                  color: 'var(--sidebar-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                section: {
                  color: 'var(--sidebar-text)',
                },
              }}
            />
          </Box>

          <Box>
            <Divider mb="xs" style={{ borderColor: 'var(--sidebar-divider)' }} />
            <NavLink
              className={classes.navLabel}
              label="Check for Updates"
              leftSection={isChecking ? <Loader size={18} color="var(--sidebar-text)" /> : <IconRefresh size={18} strokeWidth={2} />}
              onClick={handleManualUpdateCheck}
              style={{ cursor: 'pointer', borderRadius: '8px' }}
              disabled={isChecking}
              styles={{
                root: {
                  color: 'var(--sidebar-text)',
                },
                label: {
                  color: 'var(--sidebar-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                section: {
                  color: 'var(--sidebar-text)',
                },
              }}
            />
          </Box>
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </>
  );
};

export default Layout;
