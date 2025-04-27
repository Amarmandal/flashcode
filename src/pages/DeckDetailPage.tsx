import { Button, Container, Group, Stack, Title } from '@mantine/core';
import { IconBook, IconPlus } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { StatusCard } from '../components/deck/StatusCard';
import { useState } from 'react';
import { FlashcardForm } from '../components/flashcard/FlashcardForm';

interface CardStatus {
  label: string;
  count: number;
  color: string;
}

export default function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Static random counts for now
  const statuses: CardStatus[] = [
    { label: 'New', count: Math.floor(Math.random() * 10) + 1, color: 'blue' },
    { label: 'Learning', count: Math.floor(Math.random() * 10) + 1, color: 'orange' },
    { label: 'To Review', count: Math.floor(Math.random() * 10) + 1, color: 'green' },
  ];

  const handleAddFlashcard = () => {
    setIsFormOpen(true);
  };

  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Deck Details</Title>
          <Button variant="filled" color="teal" leftSection={<IconPlus size={16} />} onClick={handleAddFlashcard}>
            Add Flash
          </Button>
        </Group>
        <Group justify="center" grow>
          {statuses.map((status) => (
            <StatusCard key={status.label} label={status.label} count={status.count} color={status.color} />
          ))}
        </Group>
        <Button
          size="xl"
          radius="md"
          color="teal"
          leftSection={<IconBook size={24} />}
          fullWidth
          mt="lg"
          component={Link}
          to="study-now"
        >
          Study Now
        </Button>
        <FlashcardForm opened={isFormOpen} onClose={() => setIsFormOpen(false)} deckId={deckId!} />
      </Stack>
    </Container>
  );
}
