import { Alert, Button, Card, Container, Divider, Group, Stack, Text, Title, Progress } from '@mantine/core';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { IconAlertCircle, IconEye, IconCircleCheckFilled, IconBoltFilled, IconReload } from '@tabler/icons-react';
import { CodeBlockWithHeader } from '../components/flashcard/CodeBlockWithHeader';
import { Congratulations } from '../components/common/Congratulations';
import { invoke } from '@tauri-apps/api/core';
import { SuccessApiResponse } from '../types/successApiResponse';

interface Flashcard {
  id: number;
  front: string;
  back: string;
  deck_id: number;
  language: string;
  ease_factor: number;
  repetitions: number;
  interval: number;
  created_at: string;
  due_date: number;
  is_reversed: boolean;
}

enum CardAnswer {
  Again = 'Again',
  Hard = 'Hard',
  Good = 'Good',
  Easy = 'Easy',
}

// Define the type for the current card state
interface CurrentCardState {
  index: number;
  card: Flashcard | null;
  completed: boolean;
}

export function htmlDecode(input: string) {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent || '';
}

export default function StudyNow() {
  const { deckId } = useParams<{ deckId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const passedFlashcards = location.state?.flashcards || [];

  const [flashcards, setFlashcards] = useState<Flashcard[]>(passedFlashcards);
  const [error, setError] = useState<string | null>(null);
  // Include completed flag in state
  const [currentCardState, setCurrentCardState] = useState<CurrentCardState>({
    index: 0,
    card: passedFlashcards.length > 0 ? passedFlashcards[0] : null,
    completed: false,
  });
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    // If we already have flashcards from location state, use them
    if (passedFlashcards.length > 0) {
      setFlashcards(passedFlashcards);
      setCurrentCardState({
        index: 0,
        card: passedFlashcards[0],
        completed: false,
      });
      return;
    }

    if (deckId) {
      const fetchFlashcards = async () => {
        try {
          const res = await invoke<
            SuccessApiResponse<{ cards: Flashcard[]; new: number; learning: number; to_review: number }>
          >('get_queues_for_today', { deckId: Number(deckId) });

          if (res.success && res.data.cards.length > 0) {
            setFlashcards(res.data.cards);
            setCurrentCardState({
              index: 0,
              card: res.data.cards[0],
              completed: false,
            });
          } else {
            // No cards to study or API error
            setCurrentCardState({
              index: 0,
              card: null,
              completed: true,
            });
          }
        } catch (error) {
          console.error('Error fetching flashcards:', error);
          setError('Failed to fetch flashcards. Please try again.');
        }
      };

      fetchFlashcards();
    }
  }, [deckId, passedFlashcards]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleOptionClick = async (option: CardAnswer) => {
    console.log('Option clicked:', option, 'for card:', currentCardState.card?.id);

    if (!currentCardState.card) return;

    try {
      // Call the Tauri answer_flashcard command
      await invoke('answer_flashcard', {
        id: currentCardState.card.id.toString(),
        answer: option,
      });

      if (option === CardAnswer.Again) {
        const updatedFlashcards = [...flashcards];
        const currentCard = updatedFlashcards.splice(currentCardState.index, 1)[0];
        updatedFlashcards.push(currentCard);
        setFlashcards(updatedFlashcards);

        // If we're at the end of the list after removing the current card,
        // we need to go back to the start
        const nextIndex = currentCardState.index < updatedFlashcards.length ? currentCardState.index : 0;

        setCurrentCardState({
          index: nextIndex,
          card: updatedFlashcards[nextIndex],
          completed: false,
        });
      } else {
        // For all other options, just move to the next card
        const isLastCard = currentCardState.index >= flashcards.length - 1;

        setCurrentCardState({
          index: isLastCard ? currentCardState.index : currentCardState.index + 1,
          card: isLastCard ? currentCardState.card : flashcards[currentCardState.index + 1],
          completed: isLastCard,
        });
      }

      // Always reset the answer display
      setShowAnswer(false);
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit your answer. Please try again.');
    }
  };

  const handleBackToDeck = () => {
    navigate(`/deck/${deckId}`);
  };

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert
          variant="light"
          color="red"
          title="Alert title"
          icon={<IconAlertCircle size="1rem" color="red" />}
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      </Container>
    );
  }

  // If completed, show congratulations component
  if (currentCardState.completed || !currentCardState.card) {
    return (
      <Congratulations
        title="Well done!"
        message="You've completed your study session for today."
        buttonText="Back to Deck"
        onReset={handleBackToDeck}
      />
    );
  }

  // Progress bar and header
  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between" align="center" mb="xs">
          <Title order={2}>
            Studying Deck #{deckId} - Card {currentCardState.index + 1} of {flashcards.length}
          </Title>
          <Card radius="xl" px="md" py={4} bg={currentCardState.card?.is_reversed ? 'blue.1' : 'gray.1'} withBorder>
            <Group gap={4}>
              {currentCardState.card?.is_reversed && <IconEye size={16} color="#228be6" />}
              <Text size="sm" fw={500} c={currentCardState.card?.is_reversed ? 'blue.7' : 'gray.7'}>
                {currentCardState.card?.is_reversed ? 'Reversed' : 'Basic'}
              </Text>
            </Group>
          </Card>
        </Group>
        {/* Progress bar */}
        <Progress
          value={((currentCardState.index + 1) / (flashcards.length || 1)) * 100}
          radius="md"
          size="md"
          color="blue"
          mb={16}
        />
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack align="center" gap="xs">
            {/* FRONT label */}
            <Text size="xs" fw={700} c="gray.6" style={{ alignSelf: 'flex-start' }}>
              FRONT
            </Text>
            {currentCardState.card?.is_reversed ? (
              <CodeBlockWithHeader
                code={htmlDecode(currentCardState.card.front) || ''}
                language={currentCardState.card.language}
              />
            ) : (
              <Text size="xl" fw={700} lh={1.4} ta="center" mb="md">
                {currentCardState.card?.front}
              </Text>
            )}
            <Divider my="xs" style={{ width: '100%' }} />
            {/* Show Answer Button or BACK section */}
            {showAnswer ? (
              <>
                {/* BACK label */}
                <Text size="xs" fw={700} c="gray.6" style={{ alignSelf: 'flex-start' }}>
                  BACK
                </Text>
                {!currentCardState.card?.is_reversed ? (
                  <CodeBlockWithHeader
                    code={htmlDecode(currentCardState.card?.back || '') || ''}
                    language={currentCardState.card?.language}
                  />
                ) : (
                  <Text size="xl" fw={700} lh={1.4} ta="center" mb="md">
                    {currentCardState.card?.back}
                  </Text>
                )}
                {/* Feedback buttons with icons */}
                <Group justify="center" mt="md" gap="sm">
                  <Button
                    variant="outline"
                    color="red"
                    leftSection={<IconReload size={18} />}
                    onClick={() => handleOptionClick(CardAnswer.Again)}
                  >
                    Again
                  </Button>
                  <Button
                    variant="outline"
                    color="orange"
                    leftSection={<IconEye size={18} />}
                    onClick={() => handleOptionClick(CardAnswer.Hard)}
                  >
                    Hard
                  </Button>
                  <Button
                    variant="outline"
                    color="teal"
                    leftSection={<IconCircleCheckFilled size={18} />}
                    onClick={() => handleOptionClick(CardAnswer.Good)}
                  >
                    Good
                  </Button>
                  <Button
                    variant="outline"
                    color="blue"
                    leftSection={<IconBoltFilled size={18} />}
                    onClick={() => handleOptionClick(CardAnswer.Easy)}
                  >
                    Easy
                  </Button>
                </Group>
              </>
            ) : (
              <Button
                size="lg"
                variant="filled"
                color="teal"
                leftSection={<IconEye size={20} />}
                onClick={handleShowAnswer}
                mt="md"
              >
                Show Answer
              </Button>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
