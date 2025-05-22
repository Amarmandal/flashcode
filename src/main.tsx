import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { ThemeProvider, useTheme } from './hooks/useTheme';

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
