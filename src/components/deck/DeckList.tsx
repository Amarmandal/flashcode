import { Card, Group, Text, Stack, ActionIcon } from '@mantine/core';
import { Link } from 'react-router-dom';
import { Deck } from '../../types/deck';
import { IconTrash, IconPencil, IconStar } from '@tabler/icons-react';
import ConfirmationModal from '../common/ConfirmationModal';
import { useState } from 'react';

const hoverActionStyle = (visible: boolean): React.CSSProperties => ({
  opacity: visible ? 1 : 0,
  transition: 'opacity 150ms ease',
  pointerEvents: visible ? 'auto' : 'none',
});

interface DeckListProps {
  decks: Deck[];
  onEdit: (deck: Deck) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (deck: Deck) => void;
}

export function DeckList({ decks, onEdit, onDelete, onToggleFavorite }: DeckListProps) {
  const [deckToRemove, setDeckToRemove] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredDeckId, setHoveredDeckId] = useState<string | null>(null);

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

      {decks.map((deck) => {
        const isHovered = hoveredDeckId === deck.id;
        return (
          <Card
            key={deck.id}
            withBorder
            shadow="sm"
            radius="md"
            onMouseEnter={() => setHoveredDeckId(deck.id)}
            onMouseLeave={() => setHoveredDeckId(null)}
          >
            <Group justify="space-between">
              <Text fw={500} component={Link} to={`/deck/${deck.id}`} style={{ flex: 1 }}>
                {deck.name}
              </Text>
              <Group gap="xs">
                <ActionIcon
                  variant="outline"
                  color="blue"
                  size="sm"
                  style={hoverActionStyle(isHovered)}
                  onClick={() => onEdit(deck)}
                >
                  <IconPencil size={15} />
                </ActionIcon>
                <ActionIcon
                  variant="outline"
                  color="red"
                  size="sm"
                  style={hoverActionStyle(isHovered)}
                  onClick={(e) => { e.stopPropagation(); handleRemoveClick(deck.id); }}
                >
                  <IconTrash size={15} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color={deck.isFavorite ? 'yellow' : 'gray'}
                  size="sm"
                  style={hoverActionStyle(isHovered || !!deck.isFavorite)}
                  onClick={() => onToggleFavorite(deck)}
                >
                  <IconStar size={15} fill={deck.isFavorite ? 'gold' : 'none'} style={{ transition: 'fill 150ms ease' }} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
