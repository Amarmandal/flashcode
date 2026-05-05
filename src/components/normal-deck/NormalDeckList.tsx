import { Stack, Group, Text, ActionIcon, Tooltip, Card, Box } from '@mantine/core';
import { IconTrash, IconEdit, IconHeart, IconHeartFilled, IconBrain } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { NormalDeck } from '../../types/normalDeck';
import { useState } from 'react';

interface NormalDeckListProps {
  decks: NormalDeck[];
  onEdit: (deck: NormalDeck) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (deck: NormalDeck) => void;
}

export function NormalDeckList({ decks, onEdit, onDelete, onToggleFavorite }: NormalDeckListProps) {
  const [hoveredDeckId, setHoveredDeckId] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <Stack gap="md">
      {decks.map((deck) => {
        const isHovered = hoveredDeckId === deck.id;
        return (
          <Card
            key={deck.id}
            radius="lg"
            p="lg"
            onMouseEnter={() => setHoveredDeckId(deck.id)}
            onMouseLeave={() => setHoveredDeckId(null)}
            onClick={() => navigate(`/normal-deck/${deck.id}`)}
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
                    background: 'var(--icon-badge-brain-bg)',
                    color: 'var(--icon-badge-brain-color)',
                  }}
                >
                  <IconBrain size={16} strokeWidth={2} />
                </Box>
                <Text
                  fw={500}
                  size="md"
                  style={{
                    flex: 1,
                    color: 'var(--text-primary)',
                  }}
                >
                  {deck.name}
                </Text>
              </Group>
              <Group gap="xs">
                <Tooltip label={deck.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <ActionIcon
                    variant="subtle"
                    color="yellow"
                    size="md"
                    radius="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(deck);
                    }}
                    style={{
                      opacity: isHovered || deck.isFavorite ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    {deck.isFavorite ? (
                      <IconHeartFilled size={16} style={{ color: '#d97706' }} />
                    ) : (
                      <IconHeart size={16} />
                    )}
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Edit">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="md"
                    radius="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(deck);
                    }}
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="md"
                    radius="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(deck.id);
                    }}
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
