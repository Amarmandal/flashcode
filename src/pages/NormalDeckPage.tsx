import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { invoke } from '@tauri-apps/api/core';
import { Alert, Box, Button, Container, Stack } from '@mantine/core';
import { useEffect, useState } from 'react';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { NormalDeck } from '../types/normalDeck';
import { NormalDeckForm } from '../components/normal-deck/NormalDeckForm';
import { NormalDeckList } from '../components/normal-deck/NormalDeckList';
import { SuccessApiResponse } from '../types/successApiResponse';

export default function NormalDeckPage() {
  const [decks, setDecks] = useState<NormalDeck[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<NormalDeck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDecks = async () => {
    try {
      const res = await invoke<SuccessApiResponse<NormalDeck[]>>('get_all_normal_decks');
      setDecks(res.data);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to fetch decks');
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleCreate = async (name: string) => {
    try {
      const res = await invoke<SuccessApiResponse<NormalDeck>>('create_normal_deck', { name });
      setDecks((prev) => [...prev, res.data]);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to create deck');
    }
  };

  const handleUpdate = async (name: string) => {
    if (!editingDeck) return;
    try {
      await invoke<SuccessApiResponse<string>>('update_normal_deck', {
        deck: { ...editingDeck, name },
      });
      setDecks((prev) => prev.map((d) => (d.id === editingDeck.id ? { ...d, name } : d)));
      setEditingDeck(null);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to update deck');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await invoke('delete_normal_deck', { id });
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError((e as Error)?.message || 'Failed to delete deck');
    }
  };

  const handleToggleFavorite = async (deck: NormalDeck) => {
    try {
      await invoke('update_normal_deck', { deck: { ...deck, isFavorite: !deck.isFavorite } });
      setDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, isFavorite: !d.isFavorite } : d))
      );
    } catch (e) {
      setError((e as Error)?.message || 'Failed to update deck');
    }
  };

  const openCreate = () => {
    setEditingDeck(null);
    setIsFormOpen(true);
  };

  const openEdit = (deck: NormalDeck) => {
    setEditingDeck(deck);
    setIsFormOpen(true);
  };

  return (
    <Container size="lg" py="xl">
      {error && (
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertCircle size="1rem" />}
          onClose={() => setError(null)}
          withCloseButton
          mb="lg"
          radius="md"
          styles={{
            root: {
              background: 'rgba(220, 38, 38, 0.1)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
            },
          }}
        >
          {error}
        </Alert>
      )}
      <Stack gap="xl">
        <PageHeader title="Flashcards" description="Make room for what you want to remember. Organize questions and answers into decks." eyebrow="Learn anything" actions={
<Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreate}
            radius="sm"
            styles={{
              root: {
                background: 'var(--primary-btn-bg)',
                color: 'var(--primary-btn-text)',
              },
            }}
          >
            Create Deck
          </Button>
} />

        <Box style={{ minHeight: '60vh' }}>
          {decks.length === 0 ? (
            <EmptyState title="Your next idea starts here" description="Use the button above to add your first collection and start a learning habit." />
          ) : (
            <NormalDeckList
              decks={decks}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </Box>
      </Stack>

      <NormalDeckForm
        opened={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingDeck ? handleUpdate : handleCreate}
        initialName={editingDeck?.name}
      />
    </Container>
  );
}
