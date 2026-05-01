import { AppShell, Burger, Divider, Flex, NavLink, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import classes from './Layout.module.css';
import AppLogo from './Logo';
import { IconCards, IconHeart, IconDatabaseSearch, IconRefresh, IconCode, IconBrain } from '@tabler/icons-react';
import { SearchBar } from '../search/SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { UpdateBanner } from './UpdateBanner';
import { UpdateNotification } from './UpdateNotification';
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
          width: 200,
          breakpoint: 'sm',
          collapsed: { mobile: !opened, desktop: isStudyMode },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Flex align="center" justify="space-between" h="100%" px="xl" gap="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <AppLogo size="medium" />
            <Flex align="center" gap="md" style={{ flex: 1, justifyContent: 'flex-end' }}>
              {!isStudyMode && <SearchBar />}
              <ThemeToggle />
            </Flex>
          </Flex>
        </AppShell.Header>

        <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <NavLink
              className={classes.navLabel}
              label="Code Deck"
              leftSection={<IconCards size={18} />}
              component={Link}
              to="/"
              active={location.pathname === '/' || location.pathname.startsWith('/deck')}
            />
            <NavLink
              className={classes.navLabel}
              label="Normal Deck"
              leftSection={<IconBrain size={18} />}
              component={Link}
              to="/normal-deck"
              active={location.pathname.startsWith('/normal-deck')}
            />
            <NavLink
              className={classes.navLabel}
              label="Favorite"
              leftSection={<IconHeart size={18} />}
              component={Link}
              to="/favorite"
              active={location.pathname === '/favorite'}
            />
            <NavLink
              className={classes.navLabel}
              label="Browse"
              leftSection={<IconDatabaseSearch size={18} />}
              component={Link}
              to="/browse"
              active={location.pathname === '/browse'}
            />
            <NavLink
              className={classes.navLabel}
              label="Library"
              leftSection={<IconCode size={18} />}
              component={Link}
              to="/library"
              active={location.pathname === '/library'}
            />
          </div>
          <div>
            <Divider mb="xs" />
            <NavLink
              className={classes.navLabel}
              label="Check for Updates"
              leftSection={isChecking ? <Loader size={18} /> : <IconRefresh size={18} />}
              onClick={handleManualUpdateCheck}
              style={{ cursor: 'pointer' }}
              disabled={isChecking}
            />
          </div>
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </>
  );
};

export default Layout;
