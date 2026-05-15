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
import NormalDeckPage from './pages/NormalDeckPage';
import NormalDeckDetailPage from './pages/NormalDeckDetailPage';
import NormalStudyPage from './pages/NormalStudyPage';
import { QuizPage } from './pages/QuizPage';
import { CreateEditQuizPage } from './pages/CreateEditQuizPage';
import { TakeQuizPage } from './pages/TakeQuizPage';
import { QuizResultsPage } from './pages/QuizResultsPage';

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
        path: 'normal-deck',
        element: <NormalDeckPage />,
      },
      {
        path: 'normal-deck/:deckId',
        element: <NormalDeckDetailPage />,
      },
      {
        path: 'normal-deck/:deckId/study',
        element: <NormalStudyPage />,
      },
      {
        path: 'quiz',
        element: <QuizPage />,
      },
      {
        path: 'quiz/new',
        element: <CreateEditQuizPage />,
      },
      {
        path: 'quiz/edit/:id',
        element: <CreateEditQuizPage />,
      },
      {
        path: 'quiz/take/:id',
        element: <TakeQuizPage />,
      },
      {
        path: 'quiz/results/:id',
        element: <QuizResultsPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];
