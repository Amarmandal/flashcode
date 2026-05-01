import { invoke } from '@tauri-apps/api/core';
import {
  Container, Stack, Group, Title, Button, Text, ActionIcon, Tooltip, Paper, Box,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { IconPlus, IconTrash, IconBook } from '@tabler/icons-react';
import { NormalDeck, NormalCard, NormalQueuesResponse } from '../types/normalDeck';
import { NormalCardForm } from '../components/normal-deck/NormalCardForm';
import { StatusCard } from '../components/deck/StatusCard';
import { SuccessApiResponse } from '../types/successApiResponse';

export default function NormalDeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<NormalDeck | null>(null);
  const [cards, setCards] = useState<NormalCard[]>([]);
  const [queues, setQueues] = useState({ new: 0, learning: 0, toReview: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const totalDue = queues.new + queues.learning + queues.toReview;

  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>{deck?.name}</Title>
          <Group>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setIsFormOpen(true)}>
              Add Card
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
    </Container>
  );
}
