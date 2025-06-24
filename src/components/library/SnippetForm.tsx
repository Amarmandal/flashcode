import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea as MantineTextarea,
  Select,
  Button,
  Stack,
  Group,
  Text as MantineText,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { invoke } from '@tauri-apps/api/core';
import { Snippet, SnippetFolder, SnippetFormData } from '../../types/snippet';
import { SuccessApiResponse } from '../../types/successApiResponse';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { CodeHighlight } from '@mantine/code-highlight';
import { LANGUAGES } from '../../assets/language-constants';
import { renderLanguageOption, getLanguageSelectLeftSection } from '../common/LanguageSelectUtils';

interface SnippetFormProps {
  opened: boolean;
  onClose: () => void;
  snippet?: Snippet | null;
  folders: SnippetFolder[];
  onSuccess: () => void;
}

export function SnippetForm({ opened, onClose, snippet, folders, onSuccess }: SnippetFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const form = useForm<SnippetFormData>({
    initialValues: {
      title: '',
      code: '',
      language: 'javascript',
      folderId: undefined,
    },
    validate: {
      title: (value) => (value.length < 1 ? 'Title is required' : null),
      code: (value) => (value.length < 1 ? 'Code is required' : null),
      language: (value) => (value.length < 1 ? 'Language is required' : null),
    },
  });

  useEffect(() => {
    if (snippet) {
      form.setValues({
        title: snippet.title,
        code: snippet.code,
        language: snippet.language,
        folderId: snippet.folderId,
      });
    } else {
      form.reset();
    }
    setError(null);
    setIsPreview(false);
  }, [snippet, opened]);

  const handleSubmit = async (values: SnippetFormData) => {
    setLoading(true);
    setError(null);

    try {
      if (snippet) {
        // Update existing snippet
        const updatedSnippet: Snippet = {
          ...snippet,
          title: values.title,
          code: values.code,
          language: values.language,
          folderId: values.folderId,
        };

        await invoke<SuccessApiResponse<string>>('update_snippet', { snippet: updatedSnippet });
      } else {
        // Create new snippet
        await invoke<SuccessApiResponse<Snippet>>('create_snippet', {
          title: values.title,
          code: values.code,
          language: values.language,
          folderId: values.folderId || null,
        });
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save snippet:', err);
      setError('Failed to save snippet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const folderOptions = [
    { value: '', label: 'No Folder' },
    ...folders.map((folder) => ({
      value: folder.id.toString(),
      label: folder.name,
    })),
  ];

  return (
    <Modal opened={opened} onClose={onClose} title={snippet ? 'Edit Snippet' : 'Add New Snippet'} size="lg" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {error && (
            <MantineText c="red" size="sm">
              {error}
            </MantineText>
          )}

          <TextInput label="Title" placeholder="Enter snippet title..." required {...form.getInputProps('title')} />

          <Select
            label="Language"
            placeholder="Select language"
            data={LANGUAGES}
            renderOption={renderLanguageOption}
            leftSection={getLanguageSelectLeftSection(form.values.language)}
            required
            {...form.getInputProps('language')}
          />

          <Select
            label="Folder"
            placeholder="Select folder (optional)"
            data={folderOptions}
            value={form.values.folderId?.toString() || ''}
            onChange={(value) => form.setFieldValue('folderId', value ? parseInt(value) : undefined)}
            clearable
          />

          <Box>
            <Group justify="space-between" mb="xs">
              <MantineText size="sm" fw={500}>
                Code{' '}
                <MantineText span c="red">
                  *
                </MantineText>
              </MantineText>
              <Button
                variant="light"
                size="compact-sm"
                leftSection={isPreview ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                onClick={() => setIsPreview(!isPreview)}
              >
                {isPreview ? 'Edit' : 'Preview'}
              </Button>
            </Group>

            {isPreview ? (
              <Box
                style={{
                  border: '1px solid var(--mantine-color-gray-4)',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}
              >
                <CodeHighlight
                  code={form.values.code || '// Enter your code...'}
                  language={form.values.language}
                  withCopyButton={false}
                />
              </Box>
            ) : (
              <MantineTextarea
                placeholder="Enter your code here..."
                rows={12}
                styles={{
                  input: {
                    fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
                    fontSize: '14px',
                  },
                }}
                required
                {...form.getInputProps('code')}
              />
            )}
          </Box>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {snippet ? 'Update Snippet' : 'Create Snippet'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
