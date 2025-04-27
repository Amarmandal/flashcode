import { Modal, TextInput, Button, Group, Select, Textarea, Box, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { CodeHighlight } from '@mantine/code-highlight';
import { IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface FlashcardFormProps {
  opened: boolean;
  onClose: () => void;
  deckId: string;
}

export function FlashcardForm({ opened, onClose, deckId }: FlashcardFormProps) {
  const form = useForm({
    initialValues: {
      front: '',
      back: '',
      language: 'javascript',
    },
    validate: {
      front: (value: string) => (value.trim().length > 0 ? null : 'Title is required'),
      back: (value: string) => (value.trim().length > 0 ? null : 'Code is required'),
    },
  });
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { front: string; back: string; language: string }) => {
    try {
      // Call the Tauri command with all required parameters
      await invoke('create_flashcode', {
        front: values.front,
        back: values.back,
        deckId: Number(deckId), // Assuming deckId is available in scope
        language: values.language,
      });

      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      setError('Failed to create flashcard. Please try again.');
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');

    form.setValues({
      front: form.values.front,
      back: pastedText,
      language: form.values.language,
    });

    setIsPreview(true);
  };

  return (
    <Modal
      size="xl"
      opened={opened}
      onClose={onClose}
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
          ]}
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </Group>
      </form>
    </Modal>
  );
}
