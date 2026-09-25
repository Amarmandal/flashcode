import { Badge, Group, SimpleGrid } from '@mantine/core';
import { IconCards } from '@tabler/icons-react';
import { useState } from 'react';
import { Deck, DeckWithCount } from '../../types/deck';
import ConfirmationModal from '../common/ConfirmationModal';
import { DeckTile } from './DeckTile';
interface DeckListProps { decks: Deck[]; counts: Record<string, DeckWithCount>; onEdit: (deck: Deck) => void; onDelete: (id: string) => void; onToggleFavorite: (deck: Deck) => void; }
export function DeckList({ decks, counts, onEdit, onDelete, onToggleFavorite }: DeckListProps) {
  const [removing, setRemoving] = useState<Deck | null>(null);
  return <>
    <ConfirmationModal opened={!!removing} close={() => setRemoving(null)} confirmRemove={() => { if (removing) onDelete(removing.id); setRemoving(null); }} title="Delete deck?" message={`Delete “${removing?.name}” and its cards? This cannot be undone.`} />
    <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
      {decks.map(deck => { const count = counts[deck.id]; return <DeckTile key={deck.id} name={deck.name} href={`/deck/${deck.id}`} icon={<IconCards size={22} stroke={1.6} />} description="Code flashcards" favorite={deck.isFavorite} onFavorite={() => onToggleFavorite(deck)} onEdit={() => onEdit(deck)} onDelete={() => setRemoving(deck)}>
        {count && <Group gap={6}><Badge color="brand">{count.newCount} new</Badge><Badge color="teal">{count.learningCount + count.reviewCount} to practice</Badge></Group>}
      </DeckTile>; })}
    </SimpleGrid>
  </>;
}
