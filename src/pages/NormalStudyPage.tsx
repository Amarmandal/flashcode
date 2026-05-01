import { invoke } from '@tauri-apps/api/core';
import {
  Container, Stack, Title, Text, Button, Group, Card, Divider, Progress,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconEye, IconCircleCheckFilled, IconBoltFilled, IconReload, IconAlertCircle,
} from '@tabler/icons-react';
import { NormalCard, NormalQueuesResponse } from '../types/normalDeck';
import { Congratulations } from '../components/common/Congratulations';
import { SuccessApiResponse } from '../types/successApiResponse';

enum CardAnswer {
  Again = 'Again',
  Hard = 'Hard',
  Good = 'Good',
  Easy = 'Easy',
}

interface CurrentCardState {
  index: number;
  card: NormalCard | null;
  completed: boolean;
}

export default function NormalStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [cards, setCards] = useState<NormalCard[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCardState, setCurrentCardState] = useState<CurrentCardState>({
    index: 0,
    card: null,
    completed: false,
  });

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await invoke<SuccessApiResponse<NormalQueuesResponse>>(
          'get_normal_queues_for_today',
          { deckId: Number(deckId) }
        );
        if (res.success && res.data.cards.length > 0) {
          setCards(res.data.cards);
          setCurrentCardState({ index: 0, card: res.data.cards[0], completed: false });
        } else {
          setCurrentCardState({ index: 0, card: null, completed: true });
        }
      } catch (e) {
        setError('Failed to fetch cards. Please try again.');
      }
    };
    fetchCards();
  }, [deckId]);

  const handleAnswer = async (answer: CardAnswer) => {
    if (!currentCardState.card) return;
    try {
      await invoke('answer_normal_card', {
        id: currentCardState.card.id,
        answer,
      });

      if (answer === CardAnswer.Again) {
        const updated = [...cards];
        const current = updated.splice(currentCardState.index, 1)[0];
        updated.push(current);
        setCards(updated);
        const nextIndex = currentCardState.index < updated.length ? currentCardState.index : 0;
        setCurrentCardState({ index: nextIndex, card: updated[nextIndex], completed: false });
      } else {
        const isLast = currentCardState.index >= cards.length - 1;
        setCurrentCardState({
          index: isLast ? currentCardState.index : currentCardState.index + 1,
          card: isLast ? currentCardState.card : cards[currentCardState.index + 1],
          completed: isLast,
        });
      }

      setShowAnswer(false);
    } catch (e) {
      setError('Failed to submit answer. Please try again.');
    }
  };

  if (error) {
    return (
      <Container size="md" py="xl">
        <Stack align="center">
          <IconAlertCircle size={48} color="red" />
          <Text c="red">{error}</Text>
          <Button variant="default" onClick={() => navigate(-1)}>Go Back</Button>
        </Stack>
      </Container>
    );
  }

  if (currentCardState.completed || !currentCardState.card) {
    return (
      <Congratulations
        title="Well done!"
        message="You've completed your study session for today."
        buttonText="Back to Deck"
        onReset={() => navigate(`/normal-deck/${deckId}`)}
      />
    );
  }

  const card = currentCardState.card;
  const progress = ((currentCardState.index + 1) / (cards.length || 1)) * 100;

  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between" align="center" mb="xs">
          <Title order={2}>
            Card {currentCardState.index + 1} of {cards.length}
          </Title>
        </Group>

        <Progress value={progress} radius="md" size="md" color="blue" mb={16} />

        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="xs">
            <Text size="xs" fw={700} c="dimmed" style={{ alignSelf: 'flex-start' }}>
              FRONT
            </Text>
            <Text size="xl" fw={700} lh={1.5} style={{ whiteSpace: 'pre-wrap' }}>
              {card.front}
            </Text>

            <Divider my="xs" />

            {showAnswer ? (
              <>
                <Text size="xs" fw={700} c="dimmed" style={{ alignSelf: 'flex-start' }}>
                  BACK
                </Text>
                <div
                  style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: card.back }}
                />
                <Group justify="center" mt="md" gap="sm">
                  <Button
                    variant="outline"
                    color="red"
                    leftSection={<IconReload size={18} />}
                    onClick={() => handleAnswer(CardAnswer.Again)}
                  >
                    Again
                  </Button>
                  <Button
                    variant="outline"
                    color="orange"
                    leftSection={<IconEye size={18} />}
                    onClick={() => handleAnswer(CardAnswer.Hard)}
                  >
                    Hard
                  </Button>
                  <Button
                    variant="outline"
                    color="teal"
                    leftSection={<IconCircleCheckFilled size={18} />}
                    onClick={() => handleAnswer(CardAnswer.Good)}
                  >
                    Good
                  </Button>
                  <Button
                    variant="outline"
                    color="blue"
                    leftSection={<IconBoltFilled size={18} />}
                    onClick={() => handleAnswer(CardAnswer.Easy)}
                  >
                    Easy
                  </Button>
                </Group>
              </>
            ) : (
              <Button
                size="lg"
                variant="filled"
                color="teal"
                leftSection={<IconEye size={20} />}
                onClick={() => setShowAnswer(true)}
                mt="md"
              >
                Show Answer
              </Button>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
