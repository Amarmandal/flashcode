import { RouteObject } from 'react-router-dom';
import Deck from './pages/DeckPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/common/Layout';
import DeckDetail from './pages/DeckDetailPage';
import StudyNow from './pages/StudyNowPage';
import FavoritePage from './pages/FavoritePage';

export const routes: RouteObject[] = [
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
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];
