import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // This is the original App component
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { useTheme } from './hooks/useTheme'; // Import the hook

// New wrapper component
function AppWrapper() {
  const { colorScheme } = useTheme(); // Get the current theme

  return (
    <MantineProvider theme={{ colorScheme }}>
      <App />
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppWrapper /> {/* Render the wrapper */}
  </React.StrictMode>
);
