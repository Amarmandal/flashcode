import { Card, Group, Text, Stack, ActionIcon } from '@mantine/core';
import { Link } from 'react-router-dom';
import { Deck } from '../../types/deck';
import { IconTrash, IconPencil, IconStar } from '@tabler/icons-react';
import ConfirmationModal from '../common/ConfirmationModal';
import { useState } from 'react';

interface DeckListProps {
  decks: Deck[];
  onEdit: (deck: Deck) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (deck: Deck) => void;
}

export function DeckList({ decks, onEdit, onDelete, onToggleFavorite }: DeckListProps) {
  const [deckToRemove, setDeckToRemove] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRemoveClick = (id: string) => {
    setDeckToRemove(id);
    setIsModalOpen(true);
  };

  const confirmRemove = () => {
    if (deckToRemove) {
      onDelete(deckToRemove);
      setIsModalOpen(false);
      setDeckToRemove(null);
    }
  };

  const cancelRemove = () => {
    setIsModalOpen(false);
    setDeckToRemove(null);
  };

  return (
    <Stack>
      <ConfirmationModal
        opened={isModalOpen}
        close={cancelRemove}
        confirmRemove={confirmRemove}
        title="Delete Deck?"
        message="Are you sure you want to delete?"
      />

      {decks.map((deck) => (
        <Card key={deck.id} withBorder shadow="sm" radius="md">
          <Group justify="space-between">
            <Text fw={500} component={Link} to={`/deck/${deck.id}`} style={{ width: '70%' }}>
              {deck.name}
            </Text>
            <Group>
              <ActionIcon variant="outline" color="blue" size="xs" onClick={() => onEdit(deck)}>
                <IconPencil size={16} />
              </ActionIcon>
              <ActionIcon
                variant="outline"
                color="red"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveClick(deck.id);
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color={deck.isFavorite ? 'yellow' : 'gray'}
                onClick={() => onToggleFavorite(deck)}
              >
                <IconStar
                  size={16}
                  fill={deck.isFavorite ? 'gold' : 'none'}
                  style={{
                    transition: 'fill 150ms ease',
                  }}
                />
              </ActionIcon>
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
