import { invoke } from '@tauri-apps/api/core';
import { Alert, Box, Button, Container, Group, Pagination, Stack, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState, useRef } from 'react';
import { DeckList } from '../components/deck/DeckList';
import { DeckForm } from '../components/deck/DeckForm';
import { Deck as DeckType, DeckWithCount } from '../types/deck';
import { IconAlertCircle } from '@tabler/icons-react';
import { SuccessApiResponse } from '../types/successApiResponse';

export default function Deck() {
  const [decks, setDecks] = useState<DeckType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingDeck, setEditingDeck] = useState<DeckType | null>(null);
  const [activePage, setPage] = useState(1);

  const isFirstRender = useRef(true);
  const prevDepsRef = useRef({ activePage, decksLength: decks.length });

  useEffect(() => {
    const fetchDecks = async () => {
      const shouldFetch =
        isFirstRender.current ||
        prevDepsRef.current.activePage !== activePage ||
        prevDepsRef.current.decksLength !== decks.length;

      prevDepsRef.current = { activePage, decksLength: decks.length };

      if (isFirstRender.current) {
        isFirstRender.current = false;
      }

      // Skip fetch if deps haven't changed and not first render
      if (!shouldFetch) return;

      try {
        const res = (await invoke('get_all_decks', {
          queryParams: {
            page: activePage < 1 ? 1 : activePage,
            limit: 5,
          },
        })) as SuccessApiResponse<DeckWithCount[]>;

        const deckList = res.data.map((deckWithCount) => deckWithCount.deck);

        setDecks(deckList);

        if (res.totalCount) {
          setTotalCount(res.totalCount);
        }
      } catch (error) {
        console.error('Failed to fetch decks:', error);
        setError((error as Error)?.message || 'Failed to fetch decks.');
      }
    };

    fetchDecks();
  }, [activePage, setPage, decks.length]);

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

      setPage((current) => {
        // If we're deleting the last item on a page (except page 1), move to previous page
        const isLastItemOnPage = decks.length === 1 && activePage > 1;
        return isLastItemOnPage ? current - 1 : current;
      });
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
          <Button leftSection={<IconPlus size={16} />} onClick={() => openForm()}>Create New Deck</Button>
        </Group>
        <Box style={{ minHeight: '60vh' }}>
          {decks.length === 0 ? (
            <Text>No decks available. Create one to get started!</Text>
          ) : (
            <DeckList decks={decks} onToggleFavorite={handleFavorite} onEdit={openForm} onDelete={handleDelete} />
          )}
        </Box>

        {totalCount > 5 && (
          <Pagination onChange={setPage} value={activePage} total={Math.ceil(totalCount / 5)} mt="md" />
        )}

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
