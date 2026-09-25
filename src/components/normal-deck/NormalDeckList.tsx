import { SimpleGrid, Text } from '@mantine/core';
import { IconBrain } from '@tabler/icons-react';
import { useState } from 'react';
import { NormalDeck } from '../../types/normalDeck';
import { DeckTile } from '../deck/DeckTile';
import ConfirmationModal from '../common/ConfirmationModal';
interface NormalDeckListProps { decks: NormalDeck[]; onEdit: (deck: NormalDeck) => void; onDelete: (id: number) => void; onToggleFavorite: (deck: NormalDeck) => void; }
export function NormalDeckList({ decks, onEdit, onDelete, onToggleFavorite }: NormalDeckListProps) {
  const [removing, setRemoving] = useState<NormalDeck | null>(null);
  return <>
    <ConfirmationModal opened={!!removing} close={() => setRemoving(null)} confirmRemove={() => { if (removing) onDelete(removing.id); setRemoving(null); }} title="Delete deck?" message={`Delete “${removing?.name}” and its cards? This cannot be undone.`} />
    <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
      {decks.map(deck => <DeckTile key={deck.id} name={deck.name} href={`/normal-deck/${deck.id}`} icon={<IconBrain size={22} stroke={1.6} />} description="Question & answer cards" favorite={deck.isFavorite} onFavorite={() => onToggleFavorite(deck)} onEdit={() => onEdit(deck)} onDelete={() => setRemoving(deck)}><Text size="xs" c="dimmed">Spaced repetition</Text></DeckTile>)}
    </SimpleGrid>
  </>;
}
