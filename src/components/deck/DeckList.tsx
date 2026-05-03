import { Card, Group, Text, Stack, ActionIcon, Box } from '@mantine/core';
import { Link } from 'react-router-dom';
import { Deck } from '../../types/deck';
import { IconTrash, IconPencil, IconStar, IconCards } from '@tabler/icons-react';
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
            radius="lg"
            p="lg"
            onMouseEnter={() => setHoveredDeckId(deck.id)}
            onMouseLeave={() => setHoveredDeckId(null)}
            style={{
              background: 'var(--surface-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--surface-border)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              cursor: 'pointer',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="md" style={{ flex: 1 }}>
                <Box
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--icon-badge-bg)',
                    color: 'var(--icon-badge-color)',
                  }}
                >
                  <IconCards size={16} strokeWidth={2} />
                </Box>
                <Text
                  fw={500}
                  size="md"
                  component={Link}
                  to={`/deck/${deck.id}`}
                  style={{
                    flex: 1,
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                  }}
                >
                  {deck.name}
                </Text>
              </Group>
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  radius="sm"
                  style={hoverActionStyle(isHovered)}
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(deck);
                  }}
                >
                  <IconPencil size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="md"
                  radius="sm"
                  style={hoverActionStyle(isHovered)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveClick(deck.id);
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color={deck.isFavorite ? 'yellow' : 'gray'}
                  size="md"
                  radius="sm"
                  style={hoverActionStyle(isHovered || !!deck.isFavorite)}
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleFavorite(deck);
                  }}
                >
                  <IconStar size={16} fill={deck.isFavorite ? '#d97706' : 'none'} style={{ transition: 'fill 150ms ease' }} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
