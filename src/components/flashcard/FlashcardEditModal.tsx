import { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Group, Select, Textarea, Box, Alert, Text, Image, SelectProps } from '@mantine/core';
import { useForm } from '@mantine/form';
import { CodeHighlight } from '@mantine/code-highlight';
import { IconAlertCircle, IconEye, IconEyeOff, IconCheck } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';

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
} from '../../assets/language-icons';

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

interface FlashcardEditModalProps {
  opened: boolean;
  onClose: () => void;
  flashcard: Flashcard;
  onSuccess: () => void;
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

export function FlashcardEditModal({ opened, onClose, flashcard, onSuccess }: FlashcardEditModalProps) {
  const form = useForm({
    initialValues: {
      front: '',
      back: '',
      language: 'rust',
    },
    validate: {
      front: (value: string) => (value.trim().length > 0 ? null : 'Front is required'),
      back: (value: string) => (value.trim().length > 0 ? null : 'Back is required'),
    },
  });

  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when flashcard changes
  useEffect(() => {
    if (flashcard) {
      form.setValues({
        front: flashcard.front,
        back: flashcard.back,
        language: flashcard.language,
      });
      setIsPreview(false);
      setError(null);
    }
  }, [flashcard]);

  const handleSubmit = async (values: { front: string; back: string; language: string }) => {
    try {
      // Call the Tauri command to update the flashcard
      await invoke('update_flashcode', {
        flashcode: {
          ...flashcard,
          front: values.front,
          back: values.back,
          language: values.language,
        },
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to update flashcard:', error);
      setError('Failed to update flashcard. Please try again.');
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

  const htmlDecode = (input: string) => {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    return doc.documentElement.textContent || '';
  };

  return (
    <Modal
      size="xl"
      opened={opened}
      onClose={onClose}
      title="Edit Flashcard"
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
          title="Error"
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
          ]}
          renderOption={renderLanguageOption}
          mb="md"
          {...form.getInputProps('language')}
        />

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
              code={htmlDecode(form.values.back) || '// Enter code above'}
              language={form.values.language}
              withCopyButton={true}
              styles={{
                root: {
                  border: '1px solid var(--mantine-color-gray-4)',
                  borderRadius: '4px',
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
          <Button variant="outline" onClick={onClose} color="gray">
            Cancel
          </Button>
          <Button type="submit" color="blue">
            Update
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
