import {
  Modal,
  TextInput,
  Button,
  Group,
  Select,
  Textarea,
  Box,
  Alert,
  Radio,
  Tooltip,
  Text,
  Image,
  SelectProps,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { CodeHighlight } from '@mantine/code-highlight';
import {
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconHelpCircle,
  IconArrowsExchange,
  IconCheck,
} from '@tabler/icons-react';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import { languageIcons } from '../../assets/language-constants'; // Centralized constants file

interface FlashcardFormProps {
  opened: boolean;
  onClose: (isSuccessful: boolean) => void;
  deckId: string;
}

// Custom render function for Select options
const renderLanguageOption: SelectProps['renderOption'] = ({ option, checked }) => (
  <Group wrap="nowrap" gap="xs">
    {option.value && languageIcons[option.value] ? (
      <Image
        src={languageIcons[option.value]}
        alt={option.label}
        width={20}
        height={20}
        style={{ objectFit: 'contain' }}
      />
    ) : null}
    <Text size="sm">{option.label}</Text>
    {checked && <IconCheck size={16} style={{ marginInlineStart: 'auto' }} />}
  </Group>
);

export function FlashcardForm({ opened, onClose, deckId }: FlashcardFormProps) {
  const form = useForm({
    initialValues: {
      front: '',
      back: '',
      language: 'rust',
      flashcardType: 'basic' as 'basic' | 'reverse',
    },
    validate: {
      front: (value: string) => (value.trim().length > 0 ? null : 'Title is required'),
      back: (value: string) => (value.trim().length > 0 ? null : 'Code is required'),
    },
  });
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: {
    front: string;
    back: string;
    language: string;
    flashcardType: 'basic' | 'reverse';
  }) => {
    try {
      // Call the Tauri command with all required parameters
      await invoke('create_flashcode', {
        front: values.front,
        back: values.back,
        deckId: Number(deckId),
        language: values.language,
        isReversed: values.flashcardType === 'reverse',
      });

      form.reset();
      onClose(true);
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      setError('Failed to create flashcard. Please try again.');
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');

    form.setValues({
      ...form.values,
      back: pastedText,
    });

    setIsPreview(true);
  };

  return (
    <Modal
      size="xl"
      opened={opened}
      onClose={() => onClose(false)}
      title="New Flashcode"
      styles={{
        title: {
          textAlign: 'center',
          fontSize: '1.5rem',
          width: '100%',
        },
      }}
    >
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
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Front"
          placeholder="Enter the title or question"
          mb="md"
          styles={{
            input: {
              fontWeight: 'bold',
              fontSize: '16px',
            },
          }}
          {...form.getInputProps('front')}
        />
        <Select
          label="Language"
          data={[
            { value: 'rust', label: 'Rust' },
            { value: 'javascript', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'cpp', label: 'C++' },
            { value: 'go', label: 'Go' },
            { value: 'typescript', label: 'TypeScript' },
            { value: 'php', label: 'PHP' },
            { value: 'swift', label: 'Swift' },
            { value: 'bash', label: 'Bash' },
          ]}
          renderOption={renderLanguageOption}
          mb="md"
          {...form.getInputProps('language')}
        />

        {/* Flashcard Type Section */}
        <Box mb="md">
          <Text mb="xs">Flashcard Type</Text>
          <Radio.Group {...form.getInputProps('flashcardType')}>
            <Group>
              <Group gap="xs">
                <Radio value="basic" label="Basic" id="basic" />
                <Tooltip label="Shows front, asks for back" withArrow position="top">
                  <IconHelpCircle size={16} style={{ cursor: 'pointer' }} />
                </Tooltip>
              </Group>

              <Group gap="xs">
                <Radio value="reverse" label="Reverse" id="reverse" />
                <Tooltip
                  label="Creates two cards - one shows front, asks back; another shows back, asks front"
                  withArrow
                  position="top"
                  multiline
                  w={220}
                >
                  <IconHelpCircle size={16} style={{ cursor: 'pointer' }} />
                </Tooltip>
              </Group>
            </Group>
          </Radio.Group>

          {form.values.flashcardType === 'reverse' && (
            <Group justify="center" mt="sm">
              <Box px="md" py="xs" bg="var(--mantine-color-gray-light)" style={{ borderRadius: '4px' }}>
                <Group gap="xs">
                  <Text size="sm">Front</Text>
                  <IconArrowsExchange size={16} color="var(--mantine-color-blue-filled)" />
                  <Text size="sm">Back</Text>
                  <Text size="sm" c="dimmed" ml="xs">
                    (two cards will be created)
                  </Text>
                </Group>
              </Box>
            </Group>
          )}
        </Box>

        <Box mb="md" pos="relative">
          <TextInput label="Back (Code)" value="" disabled styles={{ input: { display: 'none' } }} my="sm" />
          <Button
            leftSection={isPreview ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            size="compact-sm"
            variant="light"
            pos="absolute"
            top="0"
            right="4px"
            onClick={() => setIsPreview(!isPreview)}
          >
            Preview
          </Button>
          {isPreview ? (
            <CodeHighlight
              code={form.values.back || '// Enter code above'}
              language={form.values.language}
              withCopyButton={true}
              styles={{
                root: {
                  overflow: 'auto',
                  maxHeight: '364px',
                },
                copy: {
                  position: 'absolute',
                  right: 10,
                  top: 10,
                },
              }}
            />
          ) : (
            <Textarea
              placeholder="Enter or paste your code here"
              mb="md"
              minRows={8}
              maxRows={16}
              onPaste={handlePaste}
              autosize
              styles={{
                input: {
                  fontFamily: 'monospace',
                  whiteSpace: 'pre',
                  fontSize: '14px',
                },
              }}
              {...form.getInputProps('back')}
            />
          )}
        </Box>
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => onClose(false)} color="red" mr="sm">
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </Group>
      </form>
    </Modal>
  );
}
