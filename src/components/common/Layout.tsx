import { AppShell, Burger, Flex, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router-dom';
import classes from './Layout.module.css';
import AppLogo from './Logo';
import { IconCards, IconHeart } from '@tabler/icons-react';
import { SearchBar } from '../search/SearchBar';
import { ThemeToggle } from './ThemeToggle'; // Import the new component

const Layout = () => {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();

  return (
    <AppShell
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
          label="Decks"
          leftSection={<IconCards size={18} />}
          component={Link}
          to="/"
          active={location.pathname === '/' || location.pathname.includes('deck')}
        />
        <NavLink
          className={classes.navLabel}
          label="Favorite"
          leftSection={<IconHeart size={18} />}
          component={Link}
          to="/favorite"
          active={location.pathname === '/favorite'}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
