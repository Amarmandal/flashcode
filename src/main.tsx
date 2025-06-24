import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createTheme, MantineProvider } from '@mantine/core';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import '@mantine/core/styles.css';
import '@mantine/tiptap/styles.css';

// Wrapper component using the theme context
function AppWrapper() {
  const { colorScheme } = useTheme();

  const theme = createTheme({});

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <App />
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppWrapper />
    </ThemeProvider>
  </React.StrictMode>
);

// Hide the preload splash screen after React mounts
const preloadSplash = document.getElementById('preload-splash');
if (preloadSplash) {
  preloadSplash.style.display = 'none';
}
