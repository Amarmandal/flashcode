import { invoke } from '@tauri-apps/api/core';
import { Alert, Box, Button, Container, Group, Pagination, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { DeckList } from '../components/deck/DeckList';
import { DeckForm } from '../components/deck/DeckForm';
import { Deck as DeckType } from '../types/deck';
import { IconAlertCircle } from '@tabler/icons-react';
import { SuccessApiResponse } from '../types/successApiResponse';

export default function Deck() {
  const [decks, setDecks] = useState<DeckType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDeck, setEditingDeck] = useState<DeckType | null>(null);
  const [activePage, setPage] = useState(1);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const res = (await invoke('get_all_decks', { queryParams: {} })) as SuccessApiResponse<DeckType[]>;
        console.log(res.data);
        setDecks(res.data);
      } catch (error) {
        console.error('Failed to fetch decks:', error);
        setError((error as Error)?.message || 'Failed to fetch decks.');
      }
    };

    fetchDecks();
  }, []);

  // Handle deck creation
  const handleCreate = async (name: string) => {
    try {
      const res = (await invoke('create_deck', { name })) as SuccessApiResponse<DeckType>;

      setDecks((prevDecks) => [res.data, ...prevDecks]);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Failed to create deck:', error);
      setError((error as Error)?.message || 'Failed to create deck.');
    }
  };
  // Handle deck update
  const handleUpdate = (id: string, name: string) => {
    console.log('Updating deck:', { id, name });
    setEditingDeck(null);
    setIsFormOpen(false);
  };

  // Handle deck deletion
  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_deck', { id });
      setDecks((prevDecks) => prevDecks.filter((deck) => deck.id !== id));
    } catch (error: any) {
      console.error('Failed to delete deck:', error);
      setError((error as Error)?.message || `Failed to delete deck with ID ${id}.`);
    }
  };

  const handleFavorite = async (deck: DeckType) => {
    try {
      const res = (await invoke('update_deck', {
        deck: { ...deck, isFavorite: !deck.isFavorite },
      })) as SuccessApiResponse<string>;

      if (res.success === true) {
        setDecks((prevDecks) =>
          prevDecks.map((item) => (item.id === deck.id ? { ...deck, isFavorite: !deck.isFavorite } : item))
        );
      }
    } catch (error) {
      console.error('Failed to toggle favorite for deck:', error);
      setError((error as Error)?.message || 'Failed to mark as favorite');
    }
  };

  // Open form for creating or editing
  const openForm = (deck?: DeckType) => {
    setEditingDeck(deck || null);
    setIsFormOpen(true);
  };

  return (
    <Container>
      {error && (
        <Alert
          variant="light"
          color="red"
          title="Alert title"
          icon={<IconAlertCircle size="1rem" color="red" />}
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Decks</Title>
          <Button onClick={() => openForm()}>Create New Deck</Button>
        </Group>
        <Box style={{ minHeight: '60vh' }}>
          {decks.length === 0 ? (
            <Text>No decks available. Create one to get started!</Text>
          ) : (
            <DeckList decks={decks} onToggleFavorite={handleFavorite} onEdit={openForm} onDelete={handleDelete} />
          )}
        </Box>

        <Pagination onChange={setPage} value={activePage} total={10} mt="md" />

        <DeckForm
          opened={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={editingDeck ? (name) => handleUpdate(editingDeck.id, name) : handleCreate}
          initialName={editingDeck?.name}
        />
      </Stack>
    </Container>
  );
}
