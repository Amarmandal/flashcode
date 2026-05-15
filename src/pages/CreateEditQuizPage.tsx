import { invoke } from '@tauri-apps/api/core';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  ActionIcon,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconAlertCircle,
  IconPlus,
  IconTrash,
  IconArrowLeft,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { CreateQuizPayload, QuizWithQuestions } from '../types/quiz';
import { SuccessApiResponse } from '../types/successApiResponse';
import { BulkImportQuizModal } from '../components/quiz/BulkImportQuizModal';

interface FormQuestion {
  questionType: 'single-choice' | 'multiple-choice';
  questionText: string;
  options: FormOption[];
}

interface FormOption {
  optionId: string;
  optionText: string;
  isCorrect: boolean;
}

export const CreateEditQuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      fetchQuiz();
    }
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await invoke<SuccessApiResponse<QuizWithQuestions>>('get_quiz', { id: parseInt(id!) });
      setTitle(res.data.quiz.title);
      setQuestions(
        res.data.questions.map((q) => ({
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options.map((o) => ({
            optionId: o.optionId,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
          })),
        }))
      );
    } catch (e) {
      setError((e as Error)?.message || 'Failed to fetch quiz');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionType: 'single-choice',
        questionText: '',
        options: [
          { optionId: 'a', optionText: '', isCorrect: false },
          { optionId: 'b', optionText: '', isCorrect: false },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<FormQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const optionIds = ['a', 'b', 'c', 'd', 'e', 'f'];
    const existingIds = updated[questionIndex].options.map((o) => o.optionId);
    const nextId = optionIds.find((id) => !existingIds.includes(id)) || 'x';

    if (updated[questionIndex].options.length < 6) {
      updated[questionIndex].options.push({
        optionId: nextId,
        optionText: '',
        isCorrect: false,
      });
      setQuestions(updated);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
      setQuestions(updated);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, updates: Partial<FormOption>) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = {
      ...updated[questionIndex].options[optionIndex],
      ...updates,
    };
    setQuestions(updated);
  };

  const toggleCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const question = updated[questionIndex];

    if (question.questionType === 'single-choice') {
      question.options.forEach((opt, i) => {
        opt.isCorrect = i === optionIndex;
      });
    } else {
      question.options[optionIndex].isCorrect = !question.options[optionIndex].isCorrect;
    }

    setQuestions(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Quiz title is required');
      return;
    }

    if (questions.length === 0) {
      setError('At least one question is required');
      return;
    }

    for (const q of questions) {
      if (!q.questionText.trim()) {
        setError('All questions must have text');
        return;
      }

      if (q.options.some((o) => !o.optionText.trim())) {
        setError('All options must have text');
        return;
      }

      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        setError('Each question must have at least one correct answer');
        return;
      }

      if (q.questionType === 'single-choice' && correctCount > 1) {
        setError('Single-choice questions must have exactly one correct answer');
        return;
      }
    }

    const payload: CreateQuizPayload = {
      title,
      questions: questions.map((q) => ({
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options.map((o) => ({
          optionId: o.optionId,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
        })),
      })),
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await invoke('update_quiz', { id: parseInt(id!), payload });
      } else {
        await invoke('create_quiz', { payload });
      }
      navigate('/quiz');
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = (importedPayload: CreateQuizPayload) => {
    setTitle(importedPayload.title);
    setQuestions(
      importedPayload.questions.map((q) => ({
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options,
      }))
    );
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
        >
          {error}
        </Alert>
      )}

      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <ActionIcon variant="subtle" onClick={() => navigate('/quiz')} size="lg">
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={2} c="var(--text-primary)">
              {isEditMode ? 'Edit Quiz' : 'Create New Quiz'}
            </Title>
          </Group>

          <Group gap="sm">
            {!isEditMode && (
              <Button variant="light" onClick={() => setShowBulkImport(true)}>
                Bulk Import JSON
              </Button>
            )}
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSubmit}
              loading={loading}
              styles={{
                root: {
                  background: 'var(--primary-btn-bg)',
                  color: 'var(--primary-btn-text)',
                },
              }}
            >
              {isEditMode ? 'Update Quiz' : 'Create Quiz'}
            </Button>
          </Group>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <TextInput
            label="Quiz Title"
            placeholder="Enter quiz title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            size="md"
          />
        </Card>

        <Stack gap="md">
          <Group justify="space-between">
            <Text size="lg" fw={600}>
              Questions
            </Text>
            <Button leftSection={<IconPlus size={16} />} variant="light" onClick={addQuestion}>
              Add Question
            </Button>
          </Group>

          {questions.map((question, qIndex) => (
            <Card key={qIndex} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Text fw={600} size="md">
                    Question {qIndex + 1}
                  </Text>
                  <ActionIcon color="red" variant="subtle" onClick={() => removeQuestion(qIndex)}>
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>

                <Select
                  label="Question Type"
                  value={question.questionType}
                  onChange={(value) =>
                    updateQuestion(qIndex, {
                      questionType: value as 'single-choice' | 'multiple-choice',
                    })
                  }
                  data={[
                    { value: 'single-choice', label: 'Single Choice' },
                    { value: 'multiple-choice', label: 'Multiple Choice' },
                  ]}
                />

                <TextInput
                  label="Question Text"
                  placeholder="Enter your question"
                  value={question.questionText}
                  onChange={(e) => updateQuestion(qIndex, { questionText: e.currentTarget.value })}
                  required
                />

                <Box>
                  <Text size="sm" fw={500} mb="xs">
                    Options (2-6)
                  </Text>
                  <Stack gap="xs">
                    {question.options.map((option, oIndex) => (
                      <Group key={oIndex} align="center" gap="xs">
                        {question.questionType === 'single-choice' ? (
                          <Radio
                            checked={option.isCorrect}
                            onChange={() => toggleCorrectAnswer(qIndex, oIndex)}
                          />
                        ) : (
                          <Checkbox
                            checked={option.isCorrect}
                            onChange={() => toggleCorrectAnswer(qIndex, oIndex)}
                          />
                        )}

                        <TextInput
                          placeholder={`Option ${option.optionId.toUpperCase()}`}
                          value={option.optionText}
                          onChange={(e) =>
                            updateOption(qIndex, oIndex, { optionText: e.currentTarget.value })
                          }
                          style={{ flex: 1 }}
                          required
                        />

                        {question.options.length > 2 && (
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => removeOption(qIndex, oIndex)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    ))}
                  </Stack>

                  {question.options.length < 6 && (
                    <Button
                      variant="subtle"
                      size="xs"
                      mt="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => addOption(qIndex)}
                    >
                      Add Option
                    </Button>
                  )}
                </Box>
              </Stack>
            </Card>
          ))}

          {questions.length === 0 && (
            <Box
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--surface-bg)',
                border: '1px dashed var(--surface-border)',
                borderRadius: '12px',
              }}
            >
              <Text size="md" c="var(--text-secondary)">
                No questions added yet. Click "Add Question" to get started.
              </Text>
            </Box>
          )}
        </Stack>
      </Stack>

      <BulkImportQuizModal
        opened={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={handleBulkImport}
      />
    </Container>
  );
};
