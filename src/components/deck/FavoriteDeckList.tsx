import { Card, Text, Stack, Group, Center, SimpleGrid, Button, Progress, Title, ThemeIcon } from '@mantine/core';
import { Deck } from '../../types/deck';
import { IconArrowRight, IconCards } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import ConfirmationModal from '../common/ConfirmationModal';

interface FavoriteDeckListProps {
  favoriteDecks: Deck[];
  onRemoveFavorite: (deck: Deck) => void;
}

export function FavoriteDeckList({ favoriteDecks, onRemoveFavorite }: FavoriteDeckListProps) {
  const [deckToRemove, setDeckToRemove] = useState<Deck | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRemoveClick = (deck: Deck) => {
    setDeckToRemove(deck);
    setIsModalOpen(true);
  };

  const confirmRemove = () => {
    if (deckToRemove) {
      onRemoveFavorite(deckToRemove);
      setIsModalOpen(false);
      setDeckToRemove(null);
    }
  };

  const cancelRemove = () => {
    setIsModalOpen(false);
    setDeckToRemove(null);
  };

  return (
    <Stack gap="md">
      <ConfirmationModal
        opened={isModalOpen}
        close={cancelRemove}
        confirmRemove={confirmRemove}
        title="Remove from favorites?"
        message="Are you sure you want to remove this deck from your favorites?"
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
        {favoriteDecks.map((deck) => (
          <Card
            key={deck.id}
            withBorder
            padding="lg"
            radius="md"
            shadow="sm"
            style={{
              transition: 'transform 150ms ease, box-shadow 150ms ease',
              '&:hover': {
                transform: 'scale(1.01)',
              },
            }}
          >
            <Stack gap="xs" align="center">
              <Button
                variant="light"
                color="blue"
                radius="sm"
                size="xs"
                mb="xs"
                style={{
                  transition: 'all 150ms ease',
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-blue-1)',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveClick(deck);
                }}
              >
                Favorite ★
              </Button>

              <Title order={3} ta="center" c="indigo.7">
                {deck.name}
              </Title>

              <Group gap="xs" mt="sm">
                <ThemeIcon variant="light" color="green" size="sm">
                  <IconCards size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  {Math.floor(Math.random() * 20) + 5} Cards
                </Text>
              </Group>

              <Progress
                value={Math.floor(Math.random() * 100)}
                size="sm"
                color="lime"
                mt="md"
                style={{ width: '100%' }}
              />

              <Button
                variant="light"
                color="indigo"
                radius="md"
                mt="md"
                fullWidth
                component={Link}
                to={`/deck/${deck.id}/study-now`}
                rightSection={<IconArrowRight size={14} />}
              >
                Study Now
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      {favoriteDecks.length === 0 && (
        <Card withBorder shadow="sm" radius="md" p="md" mih={150}>
          <Center h="100%">
            <Stack align="center" gap="xs">
              <IconCards size={36} color="gray" />
              <Text size="sm" c="dimmed">
                No favorite decks yet.
              </Text>
            </Stack>
          </Center>
        </Card>
      )}
    </Stack>
  );
}
