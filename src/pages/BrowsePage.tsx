import { useState, useEffect } from 'react';
import { Container, Grid, Card, Text, Stack, Title, Group, ActionIcon, Alert, Flex, Image, Chip } from '@mantine/core';
import { IconCards, IconPencil, IconTrash, IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { Deck as DeckType, DeckWithCount } from '../types/deck';
import { SuccessApiResponse } from '../types/successApiResponse';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { FlashcardEditModal } from '../components/flashcard/FlashcardEditModal';
import {
  cppIcon,
  goIcon,
  javaIcon,
  javascriptIcon,
  phpIcon,
  pythonIcon,
  rustIcon,
  swiftIcon,
  typescriptIcon,
} from '../assets/language-icons';

interface Flashcard {
  id: number;
  front: string;
  back: string;
  deck_id: number;
  language: string;
  ease_factor: number;
  repetitions: number;
  interval: number;
  created_at: string;
  due_date: number;
  is_reversed: boolean;
}

// Create a mapping of language values to their icon images
const languageIcons: Record<string, string> = {
  rust: rustIcon,
  javascript: javascriptIcon,
  python: pythonIcon,
  java: javaIcon,
  cpp: cppIcon,
  go: goIcon,
  typescript: typescriptIcon,
  php: phpIcon,
  swift: swiftIcon,
};

export default function BrowsePage() {
  const [decks, setDecks] = useState<DeckType[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<DeckType | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [selectedFlashcard, setSelectedFlashcard] = useState<Flashcard | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [flashcardToDelete, setFlashcardToDelete] = useState<Flashcard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all decks on component mount
  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const res = await invoke<SuccessApiResponse<DeckWithCount[]>>('get_all_decks', {
          queryParams: { page: 1, limit: 100 },
        });

        if (res.success) {
          const deckList = res.data.map((deckWithCount: DeckWithCount) => ({
            ...deckWithCount.deck,
            id: deckWithCount.deck.id.toString(), // Convert number to string
          }));
          setDecks(deckList);
        }
      } catch (error) {
        console.error('Failed to fetch decks:', error);
        setError('Failed to fetch decks');
      }
    };

    fetchDecks();
  }, []);

  // Fetch flashcards when a deck is selected
  useEffect(() => {
    if (selectedDeck) {
      fetchFlashcards(selectedDeck.id);
    } else {
      setFlashcards([]);
    }
  }, [selectedDeck]);

  const fetchFlashcards = async (deckId: string) => {
    setLoading(true);
    try {
      const res = await invoke<SuccessApiResponse<Flashcard[]>>('get_flashcodes_by_deck', {
        deckId: Number(deckId),
      });

      if (res.success) {
        setFlashcards(res.data);
      } else {
        setFlashcards([]);
      }
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
      setError('Failed to fetch flashcards');
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeckSelect = (deck: DeckType) => {
    setSelectedDeck(deck);
    setSelectedFlashcard(null);
  };

  const handleFlashcardEdit = (flashcard: Flashcard) => {
    setSelectedFlashcard(flashcard);
    setIsEditModalOpen(true);
  };

  const handleFlashcardDelete = (flashcard: Flashcard) => {
    setFlashcardToDelete(flashcard);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!flashcardToDelete) return;

    try {
      const res = await invoke<SuccessApiResponse<string>>('delete_flashcode', {
        id: flashcardToDelete.id,
      });

      if (res.success) {
        setFlashcards((prev) => prev.filter((card) => card.id !== flashcardToDelete.id));
        setIsDeleteModalOpen(false);
        setFlashcardToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
      setError('Failed to delete flashcard');
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedFlashcard(null);
    // Refresh flashcards
    if (selectedDeck) {
      fetchFlashcards(selectedDeck.id);
    }
  };

  const getStatusDisplay = (flashcard: Flashcard) => {
    if (flashcard.repetitions === 0) {
      return { text: 'New', color: 'cyan' };
    } else if (flashcard.repetitions === 1) {
      return { text: 'Learning', color: 'teal' };
    } else {
      return { text: 'Review', color: 'green' };
    }
  };  return (
    <Container size="xl" py="md">
      {error && (
        <Alert
          variant="light"
          color="red"
          title="Error"
          icon={<IconAlertCircle size="1rem" color="red" />}
          onClose={() => setError(null)}
          withCloseButton
          mb="md"
        >
          {error}
        </Alert>
      )}

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Browse Flashcards</Title>
          <Group gap="xs">
            <IconSearch size={20} />
            <Text size="sm" c="dimmed">
              Select a deck to browse its flashcards
            </Text>
          </Group>
        </Group>

        <Grid gutter="md">
          {/* Left Panel - Deck Explorer */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder shadow="sm" radius="md" h="70vh" style={{ overflow: 'hidden' }}>
              <Card.Section p="md" withBorder>
                <Group gap="xs">
                  <IconCards size={20} />
                  <Text fw={600}>Decks ({decks.length})</Text>
                </Group>
              </Card.Section>

              <Card.Section p="md" style={{ flex: 1, overflow: 'auto' }}>
                <Stack gap="xs">
                  {decks.length === 0 ? (
                    <Text c="dimmed" ta="center" mt="md">
                      No decks available
                    </Text>
                  ) : (
                    decks.map((deck) => (
                      <Card
                        key={deck.id}
                        p="sm"
                        withBorder
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedDeck?.id === deck.id ? 'var(--mantine-color-blue-light)' : undefined,
                          borderColor: selectedDeck?.id === deck.id ? 'var(--mantine-color-blue-6)' : undefined,
                        }}
                        onClick={() => handleDeckSelect(deck)}
                      >
                        <Text fw={selectedDeck?.id === deck.id ? 600 : 400}>{deck.name}</Text>
                      </Card>
                    ))
                  )}
                </Stack>
              </Card.Section>
            </Card>
          </Grid.Col>

          {/* Right Panel - Flashcard List */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card withBorder shadow="sm" radius="md" h="70vh" style={{ overflow: 'hidden' }}>
              <Card.Section p="md" withBorder>
                <Group justify="space-between">
                  <Text fw={600}>
                    {selectedDeck ? `${selectedDeck.name} - Flashcards (${flashcards.length})` : 'Select a deck'}
                  </Text>
                  {selectedDeck && (
                    <Text size="sm" c="dimmed">
                      All flashcards regardless of status
                    </Text>
                  )}
                </Group>
              </Card.Section>

              <Card.Section p="md" style={{ flex: 1, overflow: 'auto' }}>
                {!selectedDeck ? (
                  <Flex align="center" justify="center" h="100%">
                    <Stack align="center" gap="xs">
                      <IconCards size={48} stroke={1.5} style={{ opacity: 0.5 }} />
                      <Text c="dimmed" ta="center">
                        Select a deck from the left panel to view its flashcards
                      </Text>
                    </Stack>
                  </Flex>
                ) : loading ? (
                  <Flex align="center" justify="center" h="100%">
                    <Text>Loading flashcards...</Text>
                  </Flex>
                ) : flashcards.length === 0 ? (
                  <Flex align="center" justify="center" h="100%">
                    <Stack align="center" gap="xs">
                      <IconCards size={48} stroke={1.5} style={{ opacity: 0.5 }} />
                      <Text c="dimmed" ta="center">
                        No flashcards in this deck
                      </Text>
                    </Stack>
                  </Flex>
                ) : (
                  <Stack gap="sm">
                    {flashcards.map((flashcard) => {
                      const status = getStatusDisplay(flashcard);
                      return (
                        <Card key={flashcard.id} p="md" withBorder style={{ position: 'relative' }}>
                          <Group justify="space-between" align="flex-start">
                            <Stack gap="xs" style={{ flex: 1 }}>
                              <Group gap="xs">
                                <Text fw={600} lineClamp={1}>
                                  {flashcard.front}
                                </Text>
                                <Chip checked={true} size="xs" color={status.color} variant="light">
                                  {status.text}
                                </Chip>
                                {flashcard.is_reversed && (
                                  <Chip checked={true} size="xs" color="orange" variant="light">
                                    Reversed
                                  </Chip>
                                )}
                              </Group>
                              <Text size="sm" c="dimmed" lineClamp={2}>
                                {flashcard.back.length > 100
                                  ? `${flashcard.back.substring(0, 100)}...`
                                  : flashcard.back}
                              </Text>
                              <Group gap="xs" align="center">
                                {languageIcons[flashcard.language] ? (
                                  <Image
                                    src={languageIcons[flashcard.language]}
                                    alt={flashcard.language}
                                    width={14}
                                    height={14}
                                    style={{ objectFit: 'contain' }}
                                  />
                                ) : null}
                                <Text size="xs" c="dimmed">
                                  {flashcard.language}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  •
                                </Text>
                                <Text size="xs" c="dimmed">
                                  Repetitions: {flashcard.repetitions}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  •
                                </Text>
                                <Text size="xs" c="dimmed">
                                  Ease: {flashcard.ease_factor}
                                </Text>
                              </Group>
                            </Stack>

                            <Group gap="xs">
                              <ActionIcon
                                variant="outline"
                                color="blue"
                                size="sm"
                                onClick={() => handleFlashcardEdit(flashcard)}
                              >
                                <IconPencil size={14} />
                              </ActionIcon>
                              <ActionIcon
                                variant="outline"
                                color="red"
                                size="sm"
                                onClick={() => handleFlashcardDelete(flashcard)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Card.Section>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>

      {/* Edit Modal */}
      {selectedFlashcard && (
        <FlashcardEditModal
          opened={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedFlashcard(null);
          }}
          flashcard={selectedFlashcard}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        opened={isDeleteModalOpen}
        close={() => {
          setIsDeleteModalOpen(false);
          setFlashcardToDelete(null);
        }}
        confirmRemove={confirmDelete}
        title="Delete Flashcard?"
        message={`Are you sure you want to delete "${flashcardToDelete?.front}"? This action cannot be undone.`}
      />
    </Container>
  );
}
