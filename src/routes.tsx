import { RouteObject } from 'react-router-dom';
import Deck from './pages/DeckPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/common/Layout';
import DeckDetail from './pages/DeckDetailPage';
import StudyNow from './pages/StudyNowPage';
import FavoritePage from './pages/FavoritePage';
import BrowsePage from './pages/BrowsePage';
import LibraryPage from './pages/LibraryPage';
import SplashScreen from './pages/SplashScreen';

export const routes: RouteObject[] = [
  {
    path: '/splashscreen',
    element: <SplashScreen />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Deck />,
      },
      {
        path: '/deck/:deckId',
        element: <DeckDetail />,
      },
      {
        path: '/deck/:deckId/study-now',
        element: <StudyNow />,
      },
      {
        path: 'favorite',
        element: <FavoritePage />,
      },      {
        path: 'browse',
        element: <BrowsePage />,
      },
      {
        path: 'library',
        element: <LibraryPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];
