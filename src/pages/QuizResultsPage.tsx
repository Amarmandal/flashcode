import { Box, Button, Card, Container, Group, RingProgress, Stack, Text, Title } from '@mantine/core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IconRefresh, IconArrowLeft } from '@tabler/icons-react';

interface ResultsState {
  quizTitle: string;
  totalQuestions: number;
  correctAnswers: number;
}

export const QuizResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as ResultsState;

  if (!state) {
    navigate('/quiz');
    return null;
  }

  const { quizTitle, totalQuestions, correctAnswers } = state;
  const score = Math.round((correctAnswers / totalQuestions) * 100);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const getScoreMessage = (score: number) => {
    if (score === 100) return 'Perfect! 🎉';
    if (score >= 80) return 'Excellent! 🌟';
    if (score >= 60) return 'Good job! 👍';
    if (score >= 40) return 'Keep practicing! 💪';
    return 'Try again! 📚';
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl" align="center">
        <Title order={1} ta="center" c="var(--text-primary)">
          Quiz Complete!
        </Title>

        <Card shadow="xl" padding="xl" radius="md" withBorder style={{ width: '100%' }}>
          <Stack gap="xl" align="center">
            <Box>
              <Text size="lg" fw={600} ta="center" mb="xs">
                {quizTitle}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                You've completed the quiz
              </Text>
            </Box>

            <RingProgress
              size={200}
              thickness={16}
              sections={[{ value: score, color: getScoreColor(score) }]}
              label={
                <Stack gap={0} align="center">
                  <Text size="xl" fw={700} ta="center">
                    {score}%
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    Score
                  </Text>
                </Stack>
              }
            />

            <Box style={{ width: '100%' }}>
              <Card padding="lg" radius="md" withBorder bg="var(--mantine-color-gray-0)">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="md" c="dimmed">
                      Total Questions
                    </Text>
                    <Text size="md" fw={600}>
                      {totalQuestions}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="md" c="dimmed">
                      Correct Answers
                    </Text>
                    <Text size="md" fw={600} c="green">
                      {correctAnswers}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="md" c="dimmed">
                      Incorrect Answers
                    </Text>
                    <Text size="md" fw={600} c="red">
                      {totalQuestions - correctAnswers}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Box>

            <Text size="xl" fw={600} c={getScoreColor(score)} ta="center">
              {getScoreMessage(score)}
            </Text>

            <Group justify="center" w="100%">
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="filled"
                size="lg"
                onClick={() => navigate(`/quiz/take/${id}`)}
                styles={{
                  root: {
                    background: 'var(--primary-btn-bg)',
                    color: 'var(--primary-btn-text)',
                  },
                }}
              >
                Retake Quiz
              </Button>

              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="light"
                size="lg"
                onClick={() => navigate('/quiz')}
              >
                Back to Quizzes
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};
