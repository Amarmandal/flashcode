import { Button, Container, Group, Stack, Title } from '@mantine/core';
import { IconBook, IconPlus } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { StatusCard } from '../components/deck/StatusCard';
import { useEffect, useState } from 'react';
import { FlashcardForm } from '../components/flashcard/FlashcardForm';
import { invoke } from '@tauri-apps/api/core';
import { SuccessApiResponse } from '../types/successApiResponse';
import { htmlDecode } from './StudyNowPage';

interface CardStatus {
  label: string;
  count: number;
  color: string;
}

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

export default function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statuses, setStatuses] = useState<CardStatus[]>([
    { label: 'New', count: 0, color: 'blue' },
    { label: 'Learning', count: 0, color: 'orange' },
    { label: 'To Review', count: 0, color: 'green' },
  ]);

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        const res = await invoke<
          SuccessApiResponse<{ cards: Flashcard[]; new: number; learning: number; to_review: number }>
        >('get_queues_for_today', { deckId: Number(deckId) });

        if (res.success) {
          // Update flashcards state
          const processedFlashcards = Array.isArray(res.data.cards)
            ? res.data.cards.map((flashcard) => ({
                ...flashcard,
                back: htmlDecode(flashcard.back) || '',
              }))
            : [];
          setFlashcards(processedFlashcards);

          // Update statuses state
          setStatuses([
            { label: 'New', count: res.data.new, color: 'blue' },
            { label: 'Learning', count: res.data.learning, color: 'orange' },
            { label: 'To Review', count: res.data.to_review, color: 'green' },
          ]);
        } else {
          console.error('Failed to fetch flashcards:', res.message);
          setFlashcards([]);
          setStatuses([
            { label: 'New', count: 0, color: 'blue' },
            { label: 'Learning', count: 0, color: 'orange' },
            { label: 'To Review', count: 0, color: 'green' },
          ]);
        }
      } catch (err) {
        console.error('Error fetching flashcards:', err);
        setFlashcards([]);
        setStatuses([
          { label: 'New', count: 0, color: 'blue' },
          { label: 'Learning', count: 0, color: 'orange' },
          { label: 'To Review', count: 0, color: 'green' },
        ]);
      }
    };

    fetchFlashcards();
  }, [deckId]);

  const handleAddFlashcard = () => {
    setIsFormOpen(true);
  };

  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Deck Details</Title>
          <Button variant="filled" color="teal" leftSection={<IconPlus size={16} />} onClick={handleAddFlashcard}>
            Add Flash
          </Button>
        </Group>
        <Group justify="center" grow>
          {statuses.map((status) => (
            <StatusCard key={status.label} label={status.label} count={status.count} color={status.color} />
          ))}
        </Group>
        <Button
          size="xl"
          radius="md"
          color="teal"
          leftSection={<IconBook size={24} />}
          fullWidth
          mt="lg"
          component={Link}
          to="study-now"
          state={{ flashcards }}
        >
          Study Now
        </Button>
        <FlashcardForm opened={isFormOpen} onClose={() => setIsFormOpen(false)} deckId={deckId!} />
      </Stack>
    </Container>
  );
}
