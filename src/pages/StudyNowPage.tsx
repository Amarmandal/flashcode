import { Alert, Button, Card, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { IconAlertCircle, IconEye, IconPlus } from '@tabler/icons-react';
import { NoData } from '../components/common/NoData';
import { CodeBlockWithHeader } from '../components/flashcard/CodeBlockWithHeader';
import { FlashcardForm } from '../components/flashcard/FlashcardForm';

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
}

// Define the type for the current card state
interface CurrentCardState {
  index: number;
  card: Flashcard | null;
}

export function htmlDecode(input: string) {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent;
}

export default function StudyNow() {
  const { deckId } = useParams<{ deckId: string }>();
  const location = useLocation();
  const passedFlashcards = location.state?.flashcards || [];

  const [flashcards, setFlashcards] = useState<Flashcard[]>(passedFlashcards);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Replace currentCard with currentCardState object that tracks both the index and card
  const [currentCardState, setCurrentCardState] = useState<CurrentCardState>({
    index: 0,
    card: passedFlashcards.length > 0 ? passedFlashcards[0] : null,
  });
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    // If we already have flashcards from location state, use them
    if (passedFlashcards.length > 0) {
      console.log('Using passed flashcards:', passedFlashcards);
      setFlashcards(passedFlashcards);
      setCurrentCardState({
        index: 0,
        card: passedFlashcards[0],
      });
      return;
    }
  }, [deckId, isFormOpen, passedFlashcards]);

  const handleShowAnswer = () => {
    console.log('Show answer clicked for card:', currentCardState.card?.id);
    setShowAnswer(true);
  };

  const handleOptionClick = (option: string) => {
    console.log('Option clicked:', option, 'for card:', currentCardState.card?.id);

    if (flashcards.length > 0) {
      // Check if there are more cards to show
      if (currentCardState.index < flashcards.length - 1) {
        // Move to the next card
        const nextIndex = currentCardState.index + 1;
        setCurrentCardState({
          index: nextIndex,
          card: flashcards[nextIndex],
        });
      } else {
        // We've reached the end of the deck, loop back to the first card
        setCurrentCardState({
          index: 0,
          card: flashcards[0],
        });
      }
      setShowAnswer(false);
    }
  };

  const handleAddFlashcard = () => {
    setIsFormOpen(true);
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

  if (!currentCardState.card) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="sm">
          <NoData message="No flashcards in this deck yet" />
          <Button
            variant="filled"
            color="teal"
            leftSection={<IconPlus size={16} />}
            onClick={handleAddFlashcard}
            mt="xs"
          >
            Add new
          </Button>
        </Stack>
        <FlashcardForm opened={isFormOpen} onClose={() => setIsFormOpen(false)} deckId={deckId!} />
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack>
        <Title order={2}>
          Studying Deck #{deckId} - Card {currentCardState.index + 1} of {flashcards.length}
        </Title>
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack align="center">
            <Text size="32px" fw={700} lh={1.4} ta="center">
              {currentCardState.card.front}
            </Text>
            <Divider my="xs" styles={{ root: { width: '100%' } }} />
            {showAnswer ? (
              <>
                <CodeBlockWithHeader code={currentCardState.card.back} language={currentCardState.card.language} />
                <Group justify="center" mt="md">
                  <Button variant="outline" color="red" onClick={() => handleOptionClick('Again')}>
                    Again
                  </Button>
                  <Button variant="outline" color="orange" onClick={() => handleOptionClick('Hard')}>
                    Hard
                  </Button>
                  <Button variant="outline" color="teal" onClick={() => handleOptionClick('Good')}>
                    Good
                  </Button>
                  <Button variant="outline" color="green" onClick={() => handleOptionClick('Easy')}>
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
