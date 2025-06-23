import { Group, Title, Badge, Button } from '@mantine/core';
import { IconCode, IconFolder, IconPlus } from '@tabler/icons-react';

interface LibraryHeaderProps {
  totalCount: number;
  onAddSnippet: () => void;
  onAddFolder: () => void;
}

export function LibraryHeader({ totalCount, onAddSnippet, onAddFolder }: LibraryHeaderProps) {
  return (
    <Group justify="space-between">
      <Group gap="xs">
        <IconCode size={28} />
        <Title order={2}>Library</Title>
        <Badge variant="light" color="blue">
          {totalCount} snippets
        </Badge>
      </Group>
      <Group gap="xs">
        <Button variant="light" leftSection={<IconFolder size={16} />} onClick={onAddFolder}>
          New Folder
        </Button>
        <Button leftSection={<IconPlus size={16} />} onClick={onAddSnippet}>
          Add Snippet
        </Button>
      </Group>
    </Group>
  );
}
