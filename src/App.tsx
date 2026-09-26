import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Center, Stack, Loader, Text } from '@mantine/core';
import AppLogo from './components/common/Logo';
import '@mantine/code-highlight/styles.layer.css';
import './App.css';

const router = createBrowserRouter(routes);

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center style={{ minHeight: '100vh', width: '100vw' }}>
        <Stack align="center" gap="md">
          <AppLogo size="medium" />
          <Loader size="md" type="dots" />
          <Text size="xs" c="dimmed">
            Restoring session...
          </Text>
        </Stack>
      </Center>
    );
  }

  // Gatekeeper: Unauthenticated or expired users must log in first
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <RouterProvider router={router} />;
}

export default App;
