import { ActionIcon } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useTheme();

  return (
    <ActionIcon
      onClick={() => toggleColorScheme()}
      variant="subtle"
      size="lg"
      aria-label="Toggle color scheme"
      radius="sm"
      styles={{
        root: {
          background: 'var(--surface-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--surface-border)',
          color: 'var(--text-primary)',
        },
      }}
    >
      {colorScheme === 'dark' ? <IconSun stroke={1.5} /> : <IconMoon stroke={1.5} />}
    </ActionIcon>
  );
}
