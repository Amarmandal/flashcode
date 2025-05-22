import { useState, useEffect } from 'react';
import { MantineColorScheme } from '@mantine/core';

export function useTheme() {
  const [colorScheme, setColorScheme] = useState<MantineColorScheme>(() => {
    const storedColorScheme = localStorage.getItem('mantine-color-scheme');
    if (storedColorScheme === 'light' || storedColorScheme === 'dark') {
      return storedColorScheme;
    }
    return 'light';
  });

  const toggleColorScheme = (value?: MantineColorScheme) => {
    const nextColorScheme = value || (colorScheme === 'dark' ? 'light' : 'dark');
    setColorScheme(nextColorScheme);
  };

  useEffect(() => {
    localStorage.setItem('mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  return { colorScheme, toggleColorScheme };
}
