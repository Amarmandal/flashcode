import { Alert, Button, Card, Container, Divider, Group, Stack, Text, Title, Progress, Tooltip } from '@mantine/core';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { IconAlertCircle, IconEye, IconCircleCheckFilled, IconBoltFilled, IconReload, IconArrowLeft } from '@tabler/icons-react';
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
  const [deckName, setDeckName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentCardState, setCurrentCardState] = useState<CurrentCardState>({
    index: 0,
    card: passedFlashcards.length > 0 ? passedFlashcards[0] : null,
    completed: false,
  });
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (deckId) {
      invoke<SuccessApiResponse<{ name: string }>>('get_deck', { id: Number(deckId) })
        .then((res) => { if (res.success) setDeckName((res.data as any).name || ''); })
        .catch(() => {});
    }
  }, [deckId]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!showAnswer && e.code === 'Space') {
        e.preventDefault();
        handleShowAnswer();
      } else if (showAnswer) {
        if (e.key === '1') handleOptionClick(CardAnswer.Again);
        else if (e.key === '2') handleOptionClick(CardAnswer.Hard);
        else if (e.key === '3') handleOptionClick(CardAnswer.Good);
        else if (e.key === '4') handleOptionClick(CardAnswer.Easy);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, currentCardState]);

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
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2} c="var(--text-primary)">
            {deckName ? `${deckName} — ` : ''}Card {currentCardState.index + 1} of {flashcards.length}
          </Title>
          <Group gap="sm">
            <Tooltip
              label={currentCardState.card?.is_reversed ? 'Answer shows the question (reversed)' : 'Answer shows the code solution'}
              withArrow
            >
              <Card
                radius="md"
                px="md"
                py={6}
                style={{
                  cursor: 'default',
                  background: 'var(--surface-bg)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid var(--surface-border)',
                }}
              >
                <Group gap={6}>
                  {currentCardState.card?.is_reversed && <IconEye size={14} color="var(--text-secondary)" />}
                  <Text size="xs" fw={600} c="var(--text-secondary)" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    {currentCardState.card?.is_reversed ? 'Reversed' : 'Basic'}
                  </Text>
                </Group>
              </Card>
            </Tooltip>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={handleBackToDeck}
              radius="sm"
            >
              Back to Deck
            </Button>
          </Group>
        </Group>

        <Progress
          value={((currentCardState.index + 1) / (flashcards.length || 1)) * 100}
          radius="sm"
          size="lg"
          styles={{
            root: {
              background: 'var(--progress-track)',
            },
            section: {
              background: 'var(--progress-fill)',
            },
          }}
        />
        <Card
          radius="lg"
          p="xl"
          style={{
            background: 'var(--surface-bg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <Stack align="center" gap="lg">
            <Text
              size="xs"
              fw={600}
              c="var(--text-tertiary)"
              tt="uppercase"
              style={{ alignSelf: 'flex-start', letterSpacing: '1px' }}
            >
              FRONT
            </Text>
            {currentCardState.card?.is_reversed ? (
              <CodeBlockWithHeader
                code={htmlDecode(currentCardState.card.front) || ''}
                language={currentCardState.card.language}
              />
            ) : (
              <Text size="xl" fw={600} lh={1.6} ta="center" c="var(--text-primary)" mb="md">
                {currentCardState.card?.front}
              </Text>
            )}
            <Divider style={{ width: '100%', borderColor: 'var(--border-color)' }} />

            {showAnswer ? (
              <>
                <Text
                  size="xs"
                  fw={600}
                  c="var(--text-tertiary)"
                  tt="uppercase"
                  style={{ alignSelf: 'flex-start', letterSpacing: '1px' }}
                >
                  BACK
                </Text>
                {!currentCardState.card?.is_reversed ? (
                  <CodeBlockWithHeader
                    code={htmlDecode(currentCardState.card?.back || '') || ''}
                    language={currentCardState.card?.language}
                  />
                ) : (
                  <Text size="xl" fw={600} lh={1.6} ta="center" c="var(--text-primary)" mb="md">
                    {currentCardState.card?.back}
                  </Text>
                )}

                <Group justify="center" mt="lg" gap="sm" wrap="wrap">
                  <Tooltip label="Press 1" withArrow>
                    <Button
                      variant="outline"
                      color="red"
                      leftSection={<IconReload size={18} />}
                      onClick={() => handleOptionClick(CardAnswer.Again)}
                      radius="sm"
                      styles={{
                        root: {
                          borderColor: '#dc2626',
                          color: '#dc2626',
                        },
                      }}
                    >
                      Again
                    </Button>
                  </Tooltip>
                  <Tooltip label="Press 2" withArrow>
                    <Button
                      variant="outline"
                      color="orange"
                      leftSection={<IconEye size={18} />}
                      onClick={() => handleOptionClick(CardAnswer.Hard)}
                      radius="sm"
                      styles={{
                        root: {
                          borderColor: '#d97706',
                          color: '#d97706',
                        },
                      }}
                    >
                      Hard
                    </Button>
                  </Tooltip>
                  <Tooltip label="Press 3" withArrow>
                    <Button
                      variant="outline"
                      color="teal"
                      leftSection={<IconCircleCheckFilled size={18} />}
                      onClick={() => handleOptionClick(CardAnswer.Good)}
                      radius="sm"
                      styles={{
                        root: {
                          borderColor: '#059669',
                          color: '#059669',
                        },
                      }}
                    >
                      Good
                    </Button>
                  </Tooltip>
                  <Tooltip label="Press 4" withArrow>
                    <Button
                      variant="outline"
                      color="blue"
                      leftSection={<IconBoltFilled size={18} />}
                      onClick={() => handleOptionClick(CardAnswer.Easy)}
                      radius="sm"
                      styles={{
                        root: {
                          borderColor: '#3b82f6',
                          color: '#3b82f6',
                        },
                      }}
                    >
                      Easy
                    </Button>
                  </Tooltip>
                </Group>
              </>
            ) : (
              <Stack align="center" gap="sm" mt="lg">
                <Button
                  size="xl"
                  radius="md"
                  leftSection={<IconEye size={20} />}
                  onClick={handleShowAnswer}
                  styles={{
                    root: {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      height: '56px',
                      fontSize: '16px',
                      fontWeight: 600,
                      paddingLeft: '32px',
                      paddingRight: '32px',
                    },
                  }}
                >
                  Show Answer
                </Button>
                <Text size="xs" c="var(--text-tertiary)">Press Space to reveal</Text>
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
