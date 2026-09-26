import { AppShell, Burger, Box, Group, NavLink, Loader, Text, Badge, Avatar, UnstyledButton, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { IconCards, IconHeart, IconDatabaseSearch, IconRefresh, IconCode, IconBrain, IconClipboardCheck, IconChevronRight, IconUser, IconCloudCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import AppLogo from './Logo';
import { SearchBar } from '../search/SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { UpdateBanner } from './UpdateBanner';
import { UpdateNotification } from './UpdateNotification';
import { BackupRestore } from '../backup/BackupRestore';
import { AccountSettingsModal } from './AccountSettingsModal';
import { useUpdater } from '../../hooks/useUpdater';
import { useAuth } from '../../context/AuthContext';
import { useStorage } from '../../context/StorageContext';
import classes from './Layout.module.css';

const navigation = [
  { label: 'Code decks', path: '/', prefix: '/deck', icon: IconCards, group: 'Learn' },
  { label: 'Flashcards', path: '/normal-deck', prefix: '/normal-deck', icon: IconBrain, group: 'Learn' },
  { label: 'Quizzes', path: '/quiz', prefix: '/quiz', icon: IconClipboardCheck, group: 'Learn' },
  { label: 'Favorites', path: '/favorite', prefix: '/favorite', icon: IconHeart, group: 'Organize' },
  { label: 'Card browser', path: '/browse', prefix: '/browse', icon: IconDatabaseSearch, group: 'Organize' },
  { label: 'Snippet library', path: '/library', prefix: '/library', icon: IconCode, group: 'Organize' },
];

export const Layout = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const { user, daysRemaining } = useAuth();
  const { isBackingUp } = useStorage();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const isStudyMode = pathname.endsWith('/study-now') || pathname.endsWith('/study') || pathname.startsWith('/quiz/take/') || pathname.startsWith('/quiz/results/');
  const activeItem = navigation.find(item => pathname === item.path || pathname.startsWith(item.prefix));
  const { isUpdateAvailable, isDownloading, isChecking, update, checkForUpdates, dismissUpdate } = useUpdater();

  return <>
    {isUpdateAvailable && update && <UpdateBanner version={update.version} onDownload={() => setShowUpdateModal(true)} onDismiss={dismissUpdate} isDownloading={isDownloading} />}
    <UpdateNotification opened={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
    <AccountSettingsModal opened={showAccountModal} onClose={() => setShowAccountModal(false)} />
    <AppShell header={{ height: 68 }} navbar={{ width: 208, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: isStudyMode } }} padding={0}
      classNames={{ header: classes.header, navbar: classes.sidebar, main: classes.main }}>
      <AppShell.Header>
        <Group h="100%" gap={0} wrap="nowrap">
          <Group className={classes.brand} wrap="nowrap" gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
            <Link to="/" className={classes.homeLink} aria-label="Flashcode home"><AppLogo size="small" /></Link>
          </Group>
          <Group className={classes.toolbar} justify="space-between" wrap="nowrap">
            <Group gap={8} className={classes.context} wrap="nowrap">
              <Text size="xs" c="dimmed">Workspace</Text><IconChevronRight size={12} />
              <Text size="xs" fw={600}>{isStudyMode ? 'Study session' : activeItem?.label || 'Flashcode'}</Text>
            </Group>
            <Group gap="sm" wrap="nowrap" className={classes.tools}>
              {!isStudyMode && <Box className={classes.search}><SearchBar /></Box>}
              <ThemeToggle />
              <Tooltip label={`Account: ${user?.name || 'Active'} • ${daysRemaining}d left • Google Drive`} withArrow>
                <UnstyledButton
                  onClick={() => setShowAccountModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  <Avatar src={user?.avatarUrl} size={22} radius="xl" color="blue">
                    {user?.name?.slice(0, 1) || 'U'}
                  </Avatar>
                  <Text size="xs" fw={500} visibleFrom="sm" style={{ maxWidth: 100 }} truncate>
                    {user?.name?.split(' ')[0] || 'Account'}
                  </Text>
                  {isBackingUp ? (
                    <Loader size={12} color="blue" />
                  ) : (
                    <IconCloudCheck size={14} color="#69db7c" />
                  )}
                </UnstyledButton>
              </Tooltip>
            </Group>
            <BackupRestore />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar className={classes.sidebar}>
        <Box className={classes.navBody}>
          {['Learn', 'Organize'].map(group => <Box key={group} mb="xl">
            <Text className={classes.navHeading}>{group}</Text>
            {navigation.filter(item => item.group === group).map(item => <NavLink key={item.path} component={Link} to={item.path}
              label={item.label} leftSection={<item.icon size={18} stroke={1.7} />}
              active={activeItem === item} onClick={close} classNames={{ root: classes.navItem, label: classes.navLabel }} />)}
          </Box>)}
        </Box>
        <Box className={classes.sidebarFooter}>
          <Box className={classes.studyNote}>
            <Badge size="xs" variant="dot" color="teal">Your learning space</Badge>
            <Text size="xs" c="dimmed" mt={8} lh={1.6}>A little practice.<br />A lasting understanding.</Text>
          </Box>
          <NavLink
            component={Link}
            to="/settings"
            active={pathname === '/settings'}
            label="Profile & Settings"
            leftSection={<IconUser size={16} />}
            rightSection={<Badge size="xs" variant="light" color="blue">{daysRemaining}d</Badge>}
            onClick={close}
            classNames={{ root: classes.navItem, label: classes.navLabel }}
          />
          <NavLink label="Check for updates" leftSection={isChecking ? <Loader size={16} /> : <IconRefresh size={16} />}
            onClick={() => { checkForUpdates(); setShowUpdateModal(true); }} disabled={isChecking}
            classNames={{ root: classes.navItem, label: classes.navLabel }} />
        </Box>
      </AppShell.Navbar>
      <AppShell.Main><Box className={classes.content} data-study={isStudyMode || undefined}><Outlet /></Box></AppShell.Main>
    </AppShell>
  </>;
};
