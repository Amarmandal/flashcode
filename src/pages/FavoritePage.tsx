import { invoke } from '@tauri-apps/api/core';
import { Alert, Container, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Deck as DeckType } from '../types/deck';
import { IconAlertCircle } from '@tabler/icons-react';
import { SuccessApiResponse } from '../types/successApiResponse';
import { FavoriteDeckList } from '../components/deck/FavoriteDeckList'; // Import the new component

export default function FavoritePage() {
  const [favoriteDecks, setFavoriteDecks] = useState<DeckType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavoriteDecks = async () => {
      try {
        const res = (await invoke('get_all_decks', {
          queryParams: { isFavorite: 'true' },
        })) as SuccessApiResponse<DeckType[]>;
        const favorites = res.data.filter((deck) => deck.isFavorite);
        setFavoriteDecks(favorites);
      } catch (error) {
        console.error('Failed to fetch decks:', error);
        setError((error as Error)?.message || 'Failed to fetch decks.');
      }
    };

    fetchFavoriteDecks();
  }, []);

  const handleRemoveFavorite = async (deck: DeckType) => {
    try {
      const res = (await invoke('update_deck', {
        deck: { ...deck, isFavorite: !deck.isFavorite },
      })) as SuccessApiResponse<string>;

      if (res.success === true) {
        setFavoriteDecks((prevDecks) => prevDecks.filter((item) => item.id !== deck.id));
      }
    } catch (error) {
      console.error('Failed to toggle favorite for deck:', error);
      setError((error as Error)?.message || 'Failed to mark as favorite');
    }
  };

  return (
    <Container>
      {error && (
        <Alert
          variant="light"
          color="red"
          title="Error"
          icon={<IconAlertCircle size="1rem" color="red" />}
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}
      <Stack>
        <Title order={2}>Favorite Decks</Title>
        <FavoriteDeckList onRemoveFavorite={handleRemoveFavorite} favoriteDecks={favoriteDecks} />
        {favoriteDecks.length === 0 && !error && (
          <Text c="dimmed" ta="center" mt="md">
            You haven't marked any decks as favorite yet.
          </Text>
        )}
      </Stack>
    </Container>
  );
}
