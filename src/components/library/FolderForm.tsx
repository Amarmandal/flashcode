import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Button,
  Stack,
  Group,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { invoke } from '@tauri-apps/api/core';
import { SnippetFolder } from '../../types/snippet';
import { SuccessApiResponse } from '../../types/successApiResponse';

interface FolderFormData {
  name: string;
  parentId?: number;
}

interface FolderFormProps {
  opened: boolean;
  onClose: () => void;
  folders: SnippetFolder[];
  onSuccess: () => void;
}

export function FolderForm({ opened, onClose, folders, onSuccess }: FolderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FolderFormData>({
    initialValues: {
      name: '',
      parentId: undefined,
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Folder name is required' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
      setError(null);
    }
  }, [opened]);

  const handleSubmit = async (values: FolderFormData) => {
    setLoading(true);
    setError(null);

    try {
      await invoke<SuccessApiResponse<SnippetFolder>>('create_snippet_folder', {
        name: values.name,
        parentId: values.parentId || null,
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError('Failed to create folder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const folderOptions = [
    { value: '', label: 'No Parent Folder' },
    ...folders.map((folder) => ({
      value: folder.id.toString(),
      label: folder.name,
    })),
  ];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create New Folder"
      size="sm"
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
            label="Folder Name"
            placeholder="Enter folder name..."
            required
            {...form.getInputProps('name')}
          />

          <Select
            label="Parent Folder"
            placeholder="Select parent folder (optional)"
            data={folderOptions}
            value={form.values.parentId?.toString() || ''}
            onChange={(value) => form.setFieldValue('parentId', value ? parseInt(value) : undefined)}
            clearable
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Folder
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
