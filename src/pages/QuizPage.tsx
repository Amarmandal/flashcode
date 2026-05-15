import { invoke } from '@tauri-apps/api/core';
import { Alert, Box, Button, Card, Container, Group, Stack, Title, Text, ActionIcon, Menu } from '@mantine/core';
import { useEffect, useState } from 'react';
import { IconAlertCircle, IconPlus, IconDots, IconEdit, IconTrash, IconPlayerPlay } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Quiz } from '../types/quiz';
import { SuccessApiResponse } from '../types/successApiResponse';

export const QuizPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await invoke<SuccessApiResponse<Quiz[]>>('get_all_quizzes');
      setQuizzes(res.data);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await invoke('delete_quiz', { id });
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      setError((e as Error)?.message || 'Failed to delete quiz');
    }
  };

  const handleStartQuiz = (id: number) => {
    navigate(`/quiz/take/${id}`);
  };

  const handleEditQuiz = (id: number) => {
    navigate(`/quiz/edit/${id}`);
  };

  const handleCreateQuiz = () => {
    navigate('/quiz/new');
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
        <Group justify="space-between" align="center">
          <Title order={2} c="var(--text-primary)">
            Quizzes
          </Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateQuiz}
            radius="sm"
            styles={{
              root: {
                background: 'var(--primary-btn-bg)',
                color: 'var(--primary-btn-text)',
              },
            }}
          >
            Create Quiz
          </Button>
        </Group>

        <Box style={{ minHeight: '60vh' }}>
          {loading ? (
            <Box
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--surface-bg)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid var(--surface-border)',
                borderRadius: '12px',
              }}
            >
              <Text size="lg" c="var(--text-secondary)">
                Loading quizzes...
              </Text>
            </Box>
          ) : quizzes.length === 0 ? (
            <Box
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--surface-bg)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid var(--surface-border)',
                borderRadius: '12px',
              }}
            >
              <Text size="lg" c="var(--text-secondary)">
                No quizzes yet. Create one to get started!
              </Text>
            </Box>
          ) : (
            <Stack gap="md">
              {quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  styles={{
                    root: {
                      background: 'var(--surface-bg)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid var(--surface-border)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      },
                    },
                  }}
                >
                  <Group justify="space-between" align="center">
                    <Box style={{ flex: 1 }}>
                      <Text fw={600} size="lg" c="var(--text-primary)">
                        {quiz.title}
                      </Text>
                      <Text size="sm" c="var(--text-secondary)" mt={4}>
                        Created: {new Date(quiz.createdAt).toLocaleDateString()}
                      </Text>
                    </Box>

                    <Group gap="xs">
                      <Button
                        leftSection={<IconPlayerPlay size={16} />}
                        variant="filled"
                        onClick={() => handleStartQuiz(quiz.id)}
                        styles={{
                          root: {
                            background: 'var(--primary-btn-bg)',
                            color: 'var(--primary-btn-text)',
                          },
                        }}
                      >
                        Start Quiz
                      </Button>

                      <Menu shadow="md" width={180}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="lg">
                            <IconDots size={18} />
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={16} />}
                            onClick={() => handleEditQuiz(quiz.id)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconTrash size={16} />}
                            color="red"
                            onClick={() => handleDelete(quiz.id)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Container>
  );
};
