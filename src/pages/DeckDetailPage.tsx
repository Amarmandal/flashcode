import { Button, Container, Group, Stack, Title, Modal, Text, Anchor, Breadcrumbs } from '@mantine/core';
import { IconBook, IconPlus, IconRefresh } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { StatusCard } from '../components/deck/StatusCard';
import { useEffect, useState } from 'react';
import { FlashcardForm } from '../components/flashcard/FlashcardForm';
import { invoke } from '@tauri-apps/api/core';
import { SuccessApiResponse } from '../types/successApiResponse';
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

        if (res.success) {
          // Update flashcards state
          const processedFlashcards = Array.isArray(res.data.cards) ? res.data.cards.map((flashcard) => flashcard) : [];
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
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Breadcrumbs mb="xs">
          <Anchor component={Link} to="/" size="sm" c="var(--text-secondary)">
            Code Decks
          </Anchor>
          <Text size="sm" c="var(--text-primary)" fw={500}>
            {deckDetail?.name}
          </Text>
        </Breadcrumbs>

        <Group justify="space-between" align="center">
          <Title order={2} c="var(--text-primary)">
            {deckDetail?.name}
          </Title>
          <Group gap="sm">
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconRefresh size={16} />}
              onClick={() => setResetConfirmOpen(true)}
              radius="sm"
            >
              Reset Deck
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleAddFlashcard}
              radius="sm"
              styles={{
                root: {
                  background: 'var(--primary-btn-bg)',
                  color: 'var(--primary-btn-text)',
                },
              }}
            >
              Add Flash
            </Button>
          </Group>
        </Group>

        <Group grow gap="md">
          {statuses.map((status) => (
            <StatusCard key={status.label} label={status.label} count={status.count} color={status.color} />
          ))}
        </Group>

        <Button
          size="xl"
          radius="md"
          leftSection={<IconBook size={24} />}
          fullWidth
          mt="md"
          component={Link}
          to="study-now"
          state={{ flashcards }}
          styles={{
            root: {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              height: '60px',
              fontSize: '18px',
              fontWeight: 600,
            },
          }}
        >
          Study Now
        </Button>

        <FlashcardForm opened={isFormOpen} onClose={handleFormClose} deckId={deckId!} />

        <Modal
          opened={resetConfirmOpen}
          onClose={() => setResetConfirmOpen(false)}
          title="Reset Deck"
          centered
          radius="lg"
          styles={{
            content: {
              background: 'var(--surface-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--surface-border)',
            },
          }}
        >
          <Stack gap="lg">
            <Text c="var(--text-secondary)">
              Are you sure you want to reset all flashcards in this deck? This will reset all progress.
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button
                variant="subtle"
                onClick={() => setResetConfirmOpen(false)}
                radius="sm"
                color="gray"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetDeck}
                radius="sm"
                color="red"
                styles={{
                  root: {
                    background: '#dc2626',
                    color: '#ffffff',
                  },
                }}
              >
                Reset
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
