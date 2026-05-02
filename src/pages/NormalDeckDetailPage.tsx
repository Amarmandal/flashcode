import { invoke } from '@tauri-apps/api/core';
import {
  Container, Stack, Group, Title, Button, Text, ActionIcon, Tooltip, Paper, Box, Anchor, Breadcrumbs, Modal,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { IconPlus, IconTrash, IconBook, IconFileImport, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { NormalDeck, NormalCard, NormalQueuesResponse } from '../types/normalDeck';
import { NormalCardForm } from '../components/normal-deck/NormalCardForm';
import { BulkImportModal } from '../components/normal-deck/BulkImportModal';
import { StatusCard } from '../components/deck/StatusCard';
import { SuccessApiResponse } from '../types/successApiResponse';

export default function NormalDeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<NormalDeck | null>(null);
  const [cards, setCards] = useState<NormalCard[]>([]);
  const [queues, setQueues] = useState({ new: 0, learning: 0, toReview: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const fetchData = async () => {
    const [deckRes, queuesRes] = await Promise.all([
      invoke<SuccessApiResponse<NormalDeck>>('get_normal_deck', { id: Number(deckId) }),
      invoke<SuccessApiResponse<NormalQueuesResponse>>('get_normal_queues_for_today', {
        deckId: Number(deckId),
      }),
    ]);
    if (deckRes.success) setDeck(deckRes.data);
    if (queuesRes.success) {
      setQueues({
        new: queuesRes.data.new,
        learning: queuesRes.data.learning,
        toReview: queuesRes.data.toReview,
      });
    }
    const cardsRes = await invoke<SuccessApiResponse<NormalCard[]>>('get_normal_cards_by_deck', {
      deckId: Number(deckId),
    });
    if (cardsRes.success) setCards(cardsRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [deckId]);

  const handleAddCard = async (front: string, back: string) => {
    try {
      const res = await invoke<SuccessApiResponse<NormalCard>>('create_normal_card', {
        deckId: Number(deckId),
        front,
        back,
      });
      if (res.success) {
        setCards((prev) => [...prev, res.data]);
        setQueues((prev) => ({ ...prev, new: prev.new + 1 }));
      }
    } catch (e) {
      console.error('Failed to create card:', e);
    }
  };

  const handleDeleteCard = async (id: number) => {
    try {
      await invoke('delete_normal_card', { id });
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('Failed to delete card:', e);
    }
  };

  const handleImportComplete = (addedCount: number, skippedCount: number) => {
    notifications.show({
      title: 'Import complete',
      message: `${addedCount} cards added. ${skippedCount} skipped (duplicates or invalid).`,
      color: 'teal',
    });
    fetchData();
  };

  const handleResetDeck = async () => {
    try {
      const response = await invoke<SuccessApiResponse<number>>('reset_normal_deck', { id: Number(deckId) });
      if (response.success) {
        notifications.show({
          title: 'Deck reset',
          message: 'All cards have been reset successfully.',
          color: 'teal',
        });
        fetchData();
      } else {
        notifications.show({
          title: 'Error',
          message: 'Failed to reset deck.',
          color: 'red',
        });
      }
    } catch (err) {
      console.error('Error resetting deck:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to reset deck.',
        color: 'red',
      });
    } finally {
      setResetConfirmOpen(false);
    }
  };

  const totalDue = queues.new + queues.learning + queues.toReview;

  return (
    <Container size="md" py="xl">
      <Stack>
        <Breadcrumbs mb="xs">
          <Anchor component={Link} to="/normal-deck" size="sm">Normal Decks</Anchor>
          <Text size="sm">{deck?.name}</Text>
        </Breadcrumbs>
        <Group justify="space-between">
          <Title order={2}>{deck?.name}</Title>
          <Group>
            <Button
              variant="outline"
              color="red"
              leftSection={<IconRefresh size={16} />}
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset Deck
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setIsFormOpen(true)}>
              Add Card
            </Button>
            <Button
              leftSection={<IconFileImport size={16} />}
              variant="light"
              onClick={() => setIsBulkImportOpen(true)}
            >
              Bulk Import
            </Button>
            <Button
              variant="filled"
              color="teal"
              leftSection={<IconBook size={16} />}
              component={Link}
              to={`/normal-deck/${deckId}/study`}
              disabled={totalDue === 0}
            >
              Study Now
            </Button>
          </Group>
        </Group>

        <Group justify="center" grow>
          <StatusCard label="New" count={queues.new} color="blue" />
          <StatusCard label="Learning" count={queues.learning} color="orange" />
          <StatusCard label="To Review" count={queues.toReview} color="green" />
        </Group>

        <Box style={{ minHeight: '40vh' }}>
          {cards.length === 0 ? (
            <Text c="dimmed">No cards yet. Add one to get started!</Text>
          ) : (
            <Stack mt="md">
              <Title order={5} c="dimmed">All Cards ({cards.length})</Title>
              {cards.map((card) => (
                <Paper key={card.id} withBorder p="sm" radius="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" truncate style={{ flex: 1 }}>
                      {card.front}
                    </Text>
                    <Tooltip label="Delete card">
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteCard(card.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>

      <NormalCardForm
        opened={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddCard}
      />

      <BulkImportModal
        opened={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        deckId={Number(deckId)}
        existingFronts={cards.map((c) => c.front)}
        onImportComplete={handleImportComplete}
      />

      {/* Reset Confirmation Modal */}
      <Modal opened={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} title="Reset Deck" centered>
        <Stack>
          <Text>Are you sure you want to reset all cards in this deck? This will reset all progress.</Text>
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
    </Container>
  );
}
