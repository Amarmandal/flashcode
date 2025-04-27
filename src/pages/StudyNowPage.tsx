import { Alert, Button, Card, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { IconAlertCircle, IconEye, IconPlus } from '@tabler/icons-react';
import { NoData } from '../components/common/NoData';
import { CodeBlockWithHeader } from '../components/flashcard/CodeBlockWithHeader';
import { invoke } from '@tauri-apps/api/core';
import { SuccessApiResponse } from '../types/successApiResponse';
import { FlashcardForm } from '../components/flashcard/FlashcardForm';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  language: string;
  deckId: string;
  state: number;
}

export default function StudyNow() {
  const { deckId } = useParams<{ deckId: string }>();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        setError(null);

        const res = await invoke<SuccessApiResponse<Flashcard[]>>('get_flashcodes_by_deck', {
          deckId: Number(deckId),
        });

        if (res.success) {
          const processedFlashcards = Array.isArray(res.data)
            ? res.data.map((flashcard) => ({
                ...flashcard,
                back: htmlDecode(flashcard.back) || '',
                id: flashcard.id.toString(),
              }))
            : [];

          setFlashcards(processedFlashcards);

          // Set initial random card if available
          if (processedFlashcards.length > 0) {
            setCurrentCard(processedFlashcards[Math.floor(Math.random() * processedFlashcards.length)]);
          } else {
            setCurrentCard(null);
          }
        } else {
          setError(res.message || 'Failed to fetch flashcards');
          setFlashcards([]);
          setCurrentCard(null);
        }
      } catch (err) {
        console.error('Failed to fetch flashcards:', err);
        setError('Failed to load flashcards. Please try again.');
        setFlashcards([]);
        setCurrentCard(null);
      }
    };

    fetchFlashcards();
  }, [deckId, isFormOpen]);

  const handleShowAnswer = () => {
    console.log('Show answer clicked for card:', currentCard?.id);
    setShowAnswer(true);
  };

  const handleOptionClick = (option: string) => {
    console.log('Option clicked:', option, 'for card:', currentCard?.id);
    if (flashcards.length > 0) {
      const nextCard = flashcards[Math.floor(Math.random() * flashcards.length)];
      setCurrentCard(nextCard);
      setShowAnswer(false);
    }
  };

  function htmlDecode(input: string) {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    return doc.documentElement.textContent;
  }

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

  if (!currentCard) {
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
        <Title order={2}>Studying Deck #{deckId}</Title>
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack align="center">
            <Text size="32px" fw={700} lh={1.4} ta="center">
              {currentCard.front}
            </Text>
            <Divider my="xs" styles={{ root: { width: '100%' } }} />
            {showAnswer ? (
              <>
                <CodeBlockWithHeader code={currentCard.back} language={currentCard.language} />
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
