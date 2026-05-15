import { invoke } from '@tauri-apps/api/core';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Progress,
  Radio,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { QuizWithQuestions } from '../types/quiz';
import { SuccessApiResponse } from '../types/successApiResponse';

export const TakeQuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await invoke<SuccessApiResponse<QuizWithQuestions>>('get_quiz', { id: parseInt(id!) });
      setQuiz(res.data);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to fetch quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Text ta="center">Loading quiz...</Text>
      </Container>
    );
  }

  if (error || !quiz) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" icon={<IconAlertCircle size="1rem" />}>
          {error || 'Quiz not found'}
        </Alert>
      </Container>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleOptionToggle = (optionId: string) => {
    if (showFeedback) return;

    if (currentQuestion.questionType === 'single-choice') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    }
  };

  const handleSubmitAnswer = () => {
    const correctOptionIds = currentQuestion.options.filter((o) => o.isCorrect).map((o) => o.optionId);

    const isAnswerCorrect =
      selectedOptions.length === correctOptionIds.length &&
      selectedOptions.every((id) => correctOptionIds.includes(id));

    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);

    if (isAnswerCorrect) {
      setCorrectAnswers((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOptions([]);
      setShowFeedback(false);
      setIsCorrect(false);
    } else {
      navigate(`/quiz/results/${id}`, {
        state: {
          quizTitle: quiz.quiz.title,
          totalQuestions,
          correctAnswers: correctAnswers,
        },
      });
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Box>
          <Group justify="space-between" mb="xs">
            <Title order={2} c="var(--text-primary)">
              {quiz.quiz.title}
            </Title>
            <Text size="sm" c="var(--text-secondary)">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Text>
          </Group>
          <Progress value={progress} size="sm" radius="xl" />
        </Box>

        <Card shadow="lg" padding="xl" radius="md" withBorder>
          <Stack gap="xl">
            <Box>
              <Text size="lg" fw={600} mb="xs">
                {currentQuestion.questionText}
              </Text>
              <Text size="xs" c="dimmed">
                {currentQuestion.questionType === 'single-choice'
                  ? 'Select one answer'
                  : 'Select all that apply'}
              </Text>
            </Box>

            <Stack gap="sm">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOptions.includes(option.optionId);
                const showCorrectness = showFeedback && (isSelected || option.isCorrect);

                return (
                  <Card
                    key={option.id}
                    padding="md"
                    radius="md"
                    withBorder
                    onClick={() => handleOptionToggle(option.optionId)}
                    style={{
                      cursor: showFeedback ? 'default' : 'pointer',
                      borderColor: showCorrectness
                        ? option.isCorrect
                          ? 'var(--mantine-color-green-6)'
                          : isSelected
                          ? 'var(--mantine-color-red-6)'
                          : undefined
                        : isSelected
                        ? 'var(--mantine-color-blue-6)'
                        : undefined,
                      backgroundColor: showCorrectness
                        ? option.isCorrect
                          ? 'var(--mantine-color-green-0)'
                          : isSelected
                          ? 'var(--mantine-color-red-0)'
                          : undefined
                        : undefined,
                      borderWidth: showCorrectness || isSelected ? 2 : 1,
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="md">
                        {currentQuestion.questionType === 'single-choice' ? (
                          <Radio checked={isSelected} readOnly />
                        ) : (
                          <Checkbox checked={isSelected} readOnly />
                        )}
                        <Text size="md">{option.optionText}</Text>
                      </Group>

                      {showFeedback && option.isCorrect && (
                        <IconCheck size={20} color="var(--mantine-color-green-6)" />
                      )}
                      {showFeedback && isSelected && !option.isCorrect && (
                        <IconX size={20} color="var(--mantine-color-red-6)" />
                      )}
                    </Group>
                  </Card>
                );
              })}
            </Stack>

            {showFeedback && (
              <Alert
                color={isCorrect ? 'green' : 'red'}
                icon={isCorrect ? <IconCheck size="1rem" /> : <IconX size="1rem" />}
                radius="md"
              >
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </Alert>
            )}

            <Group justify="flex-end">
              {!showFeedback ? (
                <Button
                  size="lg"
                  onClick={handleSubmitAnswer}
                  disabled={selectedOptions.length === 0}
                  styles={{
                    root: {
                      background: 'var(--primary-btn-bg)',
                      color: 'var(--primary-btn-text)',
                    },
                  }}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleNext}
                  styles={{
                    root: {
                      background: 'var(--primary-btn-bg)',
                      color: 'var(--primary-btn-text)',
                    },
                  }}
                >
                  {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'See Results'}
                </Button>
              )}
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};
