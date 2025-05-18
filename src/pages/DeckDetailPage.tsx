import { Button, Container, Group, Stack, Title, Modal, Text } from '@mantine/core';
import { IconBook, IconPlus, IconRefresh } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { StatusCard } from '../components/deck/StatusCard';
import { useEffect, useState } from 'react';
import { FlashcardForm } from '../components/flashcard/FlashcardForm';
import { invoke } from '@tauri-apps/api/core';
import { SuccessApiResponse } from '../types/successApiResponse';
import { htmlDecode } from './StudyNowPage';
import { Deck as DeckType } from '../types/deck';

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
  const [deckDetail, setDeckDetail] = useState<DeckType>();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [statuses, setStatuses] = useState<CardStatus[]>([
    { label: 'New', count: 0, color: 'blue' },
    { label: 'Learning', count: 0, color: 'orange' },
    { label: 'To Review', count: 0, color: 'green' },
  ]);

  useEffect(() => {
    const fetchDeck = async () => {
      const response = await invoke<SuccessApiResponse<DeckType>>('get_deck', { id: Number(deckId) });
      if (response.success) {
        setDeckDetail(response.data);
      }
    };

    fetchDeck();
  }, [deckId]);

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        const res = await invoke<
          SuccessApiResponse<{ cards: Flashcard[]; new: number; learning: number; to_review: number }>
        >('get_queues_for_today', { deckId: Number(deckId) });

        console.log('Flashcards response:', res);

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
  }, [deckId, refreshTrigger]);

  const handleAddFlashcard = () => {
    setIsFormOpen(true);
  };

  const handleFormClose = (isSuccess: boolean) => {
    if (isSuccess) {
      // make my useEffect to fetch flashcards again
      setRefreshTrigger((prev) => prev + 1);
    }

    setIsFormOpen(false);
  };

  const handleResetDeck = async () => {
    try {
      const response = await invoke<SuccessApiResponse<number>>('reset_deck', { id: Number(deckId) });
      if (response.success) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error('Failed to reset deck:', response.message);
      }
    } catch (err) {
      console.error('Error resetting deck:', err);
    } finally {
      setResetConfirmOpen(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>{deckDetail?.name}</Title>
          <Group>
            <Button
              variant="outline"
              color="red"
              leftSection={<IconRefresh size={16} />}
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset Deck
            </Button>
            <Button variant="filled" color="teal" leftSection={<IconPlus size={16} />} onClick={handleAddFlashcard}>
              Add Flash
            </Button>
          </Group>
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
        <FlashcardForm opened={isFormOpen} onClose={handleFormClose} deckId={deckId!} />

        {/* Reset Confirmation Modal */}
        <Modal opened={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} title="Reset Deck" centered>
          <Stack>
            <Text>Are you sure you want to reset all flashcards in this deck? This will reset all progress.</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setResetConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="filled" color="red" onClick={handleResetDeck}>
                Reset
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
