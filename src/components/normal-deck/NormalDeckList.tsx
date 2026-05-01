import { Stack, Group, Text, ActionIcon, Tooltip, Paper } from '@mantine/core';
import { IconTrash, IconEdit, IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { NormalDeck } from '../../types/normalDeck';

interface NormalDeckListProps {
  decks: NormalDeck[];
  onEdit: (deck: NormalDeck) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (deck: NormalDeck) => void;
}

export function NormalDeckList({ decks, onEdit, onDelete, onToggleFavorite }: NormalDeckListProps) {
  return (
    <Stack>
      {decks.map((deck) => (
        <Paper key={deck.id} withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text
              fw={500}
              component={Link}
              to={`/normal-deck/${deck.id}`}
              style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
            >
              {deck.name}
            </Text>
            <Group gap="xs">
              <Tooltip label={deck.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <ActionIcon variant="subtle" color="yellow" onClick={() => onToggleFavorite(deck)}>
                  {deck.isFavorite ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Edit">
                <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(deck)}>
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete">
                <ActionIcon variant="subtle" color="red" onClick={() => onDelete(deck.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
