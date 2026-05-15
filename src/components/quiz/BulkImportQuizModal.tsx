import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  FileButton,
  Alert,
  Paper,
  Tabs,
  Textarea,
  rem,
} from '@mantine/core';
import { IconFileUpload, IconAlertCircle, IconCheck, IconTextPlus, IconUpload, IconCopy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { CreateQuizPayload } from '../../types/quiz';

interface BulkImportQuizModalProps {
  opened: boolean;
  onClose: () => void;
  onImport: (payload: CreateQuizPayload) => void;
}

export const BulkImportQuizModal: React.FC<BulkImportQuizModalProps> = ({ opened, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('file');

  const resetState = () => {
    setFile(null);
    setTextInput('');
    setError(null);
    setIsProcessing(false);
    setActiveTab('file');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processImport = async (jsonText: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      let payload: CreateQuizPayload;

      try {
        payload = JSON.parse(jsonText);
      } catch {
        setError('Invalid JSON format. Please check your file.');
        setIsProcessing(false);
        return;
      }

      if (!payload.title || typeof payload.title !== 'string') {
        setError('Quiz must have a title field');
        setIsProcessing(false);
        return;
      }

      if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
        setError('Quiz must contain at least one question');
        setIsProcessing(false);
        return;
      }

      for (const question of payload.questions) {
        if (!question.questionType || !['single-choice', 'multiple-choice'].includes(question.questionType)) {
          setError('Invalid question type. Must be "single-choice" or "multiple-choice"');
          setIsProcessing(false);
          return;
        }

        if (!question.questionText || typeof question.questionText !== 'string') {
          setError('All questions must have questionText');
          setIsProcessing(false);
          return;
        }

        if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) {
          setError('Each question must have 2-6 options');
          setIsProcessing(false);
          return;
        }

        const hasCorrect = question.options.some((o) => o.isCorrect);
        if (!hasCorrect) {
          setError('Each question must have at least one correct answer');
          setIsProcessing(false);
          return;
        }

        for (const option of question.options) {
          if (!option.optionId || !option.optionText) {
            setError('All options must have optionId and optionText');
            setIsProcessing(false);
            return;
          }
        }

        // Convert numeric optionIds to strings
        question.options = question.options.map((option) => ({
          ...option,
          optionId: String(option.optionId),
        }));
      }

      onImport(payload);
      handleClose();
    } catch {
      setError('Failed to process input. Please try again.');
      setIsProcessing(false);
    }
  };

  const validateAndImportFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    if (!selectedFile.name.endsWith('.json')) {
      setError('Only .json files are supported.');
      return;
    }

    try {
      const text = await selectedFile.text();
      await processImport(text);
    } catch {
      setError('Failed to read file. Please try again.');
    }
  };

  const handleTextImport = async () => {
    if (!textInput.trim()) {
      setError('Please enter JSON content.');
      return;
    }
    await processImport(textInput);
  };

  const iconStyle = { width: rem(16), height: rem(16) };

  const templateJSON = `{
  "title": "Your Quiz Title Here",
  "questions": [
    {
      "questionType": "single-choice",
      "questionText": "Example single-choice question?",
      "options": [
        {
          "optionId": 1,
          "optionText": "First option",
          "isCorrect": true
        },
        {
          "optionId": 2,
          "optionText": "Second option",
          "isCorrect": false
        },
        {
          "optionId": 3,
          "optionText": "Third option",
          "isCorrect": false
        }
      ]
    },
    {
      "questionType": "multiple-choice",
      "questionText": "Example multiple-choice question (select all that apply)?",
      "options": [
        {
          "optionId": 1,
          "optionText": "First correct option",
          "isCorrect": true
        },
        {
          "optionId": 2,
          "optionText": "Incorrect option",
          "isCorrect": false
        },
        {
          "optionId": 3,
          "optionText": "Second correct option",
          "isCorrect": true
        },
        {
          "optionId": 4,
          "optionText": "Another incorrect option",
          "isCorrect": false
        }
      ]
    }
  ]
}`;

  const handleCopyFormat = async () => {
    try {
      await navigator.clipboard.writeText(templateJSON);
      notifications.show({
        title: 'Format Copied!',
        message: 'Quiz format template copied to clipboard',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: 'Copy Failed',
        message: 'Failed to copy to clipboard',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Bulk Import Quiz" size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Import a complete quiz from JSON format.
        </Text>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="file" leftSection={<IconFileUpload style={iconStyle} />}>
              Upload File
            </Tabs.Tab>
            <Tabs.Tab value="text" leftSection={<IconTextPlus style={iconStyle} />}>
              Paste JSON
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="file" pt="md">
            <Stack>
              <Paper withBorder p="xl" radius="md" style={{ borderStyle: 'dashed', borderWidth: 2 }}>
                <Stack align="center" gap="md">
                  <IconUpload size={48} stroke={1.5} opacity={0.5} />
                  <Stack align="center" gap={4}>
                    <Text size="sm" fw={500}>
                      Drop your JSON file here or click to browse
                    </Text>
                    <Text size="xs" c="dimmed">
                      Only .json files are accepted
                    </Text>
                  </Stack>
                  <FileButton onChange={validateAndImportFile} accept=".json" disabled={isProcessing}>
                    {(props) => (
                      <Button {...props} variant="light" loading={isProcessing} size="md">
                        {isProcessing ? 'Importing...' : 'Select File'}
                      </Button>
                    )}
                  </FileButton>
                </Stack>
              </Paper>

              {file && !error && !isProcessing && (
                <Alert icon={<IconCheck size={16} />} color="blue" title="File selected">
                  {file.name}
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="text" pt="md">
            <Stack>
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Paste your quiz JSON below
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconCopy size={14} />}
                  onClick={handleCopyFormat}
                >
                  Copy Format
                </Button>
              </Group>
              <Textarea
                placeholder={templateJSON}
                value={textInput}
                onChange={(e) => setTextInput(e.currentTarget.value)}
                disabled={isProcessing}
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    minHeight: '300px',
                  },
                }}
              />
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleTextImport}
                loading={isProcessing}
                disabled={!textInput.trim()}
              >
                {isProcessing ? 'Importing...' : 'Import Quiz'}
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {error}
          </Alert>
        )}

        <Paper
          p="md"
          withBorder
          radius="md"
          style={{
            backgroundColor: 'var(--mantine-color-blue-light)',
            borderColor: 'var(--mantine-color-blue-light-color)',
          }}
        >
          <Text size="sm" fw={600} mb={8} c="blue.9">
            Requirements:
          </Text>
          <Stack gap={6}>
            <Text size="sm" c="blue.9">
              • Must include "title" and "questions" array
            </Text>
            <Text size="sm" c="blue.9">
              • Question types: "single-choice" or "multiple-choice"
            </Text>
            <Text size="sm" c="blue.9">
              • Each question needs 2-6 options with at least one correct answer
            </Text>
            <Text size="sm" c="blue.9">
              • Options must have "optionId" (string or number), "optionText", and "isCorrect"
            </Text>
          </Stack>
        </Paper>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
