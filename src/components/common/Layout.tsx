import { AppShell, Burger, Flex, NavLink, Loader } from '@mantine/core';
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

const Layout = () => {
  const [opened, { toggle }] = useDisclosure();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const location = useLocation();
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
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Flex align="center" justify="space-around" h="100%" pl="xl">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

            <AppLogo size="medium" />

            {/* Using a Flex to group SearchBar and ThemeToggle for better layout control */}
            <Flex align="center" gap="md">
              <SearchBar />
              <ThemeToggle />
            </Flex>
          </Flex>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <NavLink
            className={classes.navLabel}
            label="Code Deck"
            leftSection={<IconCards size={18} />}
            component={Link}
            to="/"
            active={location.pathname === '/' || (location.pathname.startsWith('/deck'))}
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
          />          <NavLink
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
          <NavLink
            className={classes.navLabel}
            label="Check for Updates"
            leftSection={isChecking ? <Loader size={18} /> : <IconRefresh size={18} />}
            onClick={handleManualUpdateCheck}
            style={{ cursor: 'pointer' }}
            disabled={isChecking}
          />
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </>
  );
};

export default Layout;
