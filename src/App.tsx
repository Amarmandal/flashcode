import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import '@mantine/code-highlight/styles.css';
import './App.css';
import './styles/glassmorphism.css';

const router = createBrowserRouter(routes);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
