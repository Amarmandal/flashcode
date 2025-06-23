import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Stack,
  Group,
  TagsInput,
  Text,
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
      description: '',
      tags: [],
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
      const tags = snippet.tags ? JSON.parse(snippet.tags) : [];
      form.setValues({
        title: snippet.title,
        code: snippet.code,
        language: snippet.language,
        description: snippet.description || '',
        tags,
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
      const tagsString = values.tags && values.tags.length > 0 ? JSON.stringify(values.tags) : undefined;

      if (snippet) {
        // Update existing snippet
        const updatedSnippet: Snippet = {
          ...snippet,
          title: values.title,
          code: values.code,
          language: values.language,
          description: values.description || undefined,
          tags: tagsString,
          folderId: values.folderId,
        };

        await invoke<SuccessApiResponse<string>>('update_snippet', { snippet: updatedSnippet });
      } else {
        // Create new snippet
        await invoke<SuccessApiResponse<Snippet>>('create_snippet', {
          title: values.title,
          code: values.code,
          language: values.language,
          description: values.description || null,
          tags: tagsString || null,
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
    <Modal
      opened={opened}
      onClose={onClose}
      title={snippet ? 'Edit Snippet' : 'Add New Snippet'}
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}

          <TextInput
            label="Title"
            placeholder="Enter snippet title..."
            required
            {...form.getInputProps('title')}
          />

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

          <Textarea
            label="Description"
            placeholder="Brief description of the snippet (optional)"
            rows={2}
            {...form.getInputProps('description')}
          />

          <TagsInput
            label="Tags"
            placeholder="Add tags..."
            description="Press Enter to add a tag"
            {...form.getInputProps('tags')}
          />

          <Box>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>
                Code <Text span c="red">*</Text>
              </Text>
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
                  withCopyButton={true}
                />
              </Box>
            ) : (
              <Textarea
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
