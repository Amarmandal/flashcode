import { Card, Text, Group, ActionIcon, Badge, Stack, Image, Tooltip, Menu, Box } from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconHeart,
  IconHeartFilled,
  IconCopy,
  IconDotsVertical,
  IconCalendar,
} from '@tabler/icons-react';
import { Snippet } from '../../types/snippet';
import { CodeHighlight } from '@mantine/code-highlight';
import { EditSnippetModal } from './EditingSnippetForm';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

enum CardAction {
  DELETE = 'delete',
  EDIT = 'edit',
  NOTHING = 'nothing',
}

interface SnippetCardProps {
  snippet: Snippet;
  viewMode: 'grid' | 'list';
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
  onToggleFavorite: (snippet: Snippet) => void;
  onCopyCode: (code: string) => void;
  languageIcon?: string;
}

export function SnippetCard({
  snippet,
  viewMode,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyCode,
  languageIcon,
}: SnippetCardProps) {
  const [usageModalOpen, setUsageModalOpen] = useState(false);

  const handleSaveNotes = async (notes: string) => {
     try {
      const updatedSnippet: Snippet = { ...snippet, description: notes };
      await invoke('update_snippet', { snippet: updatedSnippet });
    } catch (err) {
      console.error('Failed to update snippet:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCodePreview = (code: string, maxLines: number = 3) => {
    const lines = code.split('\n');
    if (lines.length <= maxLines) return code;
    return lines.slice(0, maxLines).join('\n') + '\n...';
  };

  const parseTags = (tagsString?: string): string[] => {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
    } catch {
      return [];
    }
  };

  const tags = parseTags(snippet.tags);

  const handleCardClick = (e: React.MouseEvent, action: CardAction) => {
    // Prevent opening modal when clicking on action icons or menu
    const target = e.target as HTMLElement;
    if (target.closest('.mantine-ActionIcon-root') || target.closest('.mantine-Menu-root')) {
      return;
    }

    if (action === CardAction.EDIT && target.innerText.toLocaleLowerCase() !== CardAction.DELETE) {
      onEdit(snippet);
      setUsageModalOpen(true);
      return;
    }

    if (action === CardAction.DELETE && target.innerText.toLocaleLowerCase() === CardAction.DELETE) {
      onDelete(snippet);
      return;
    }
  };

  if (viewMode === 'list') {
    return (
      <>
        <Card
          withBorder
          shadow="sm"
          radius="md"
          p="md"
          onClick={(e) => handleCardClick(e, CardAction.EDIT)}
          style={{ cursor: 'pointer' }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Group gap="xs">
                <Text fw={600} size="lg" lineClamp={1}>
                  {snippet.title}
                </Text>
                {snippet.isFavorite && <IconHeartFilled size={16} style={{ color: 'var(--mantine-color-red-6)' }} />}
              </Group>

              <Group gap="xs">
                {languageIcon && <Image src={languageIcon} alt={snippet.language} width={16} height={16} />}
                <Badge variant="light" size="sm">
                  {snippet.language}
                </Badge>
                <Text size="xs" c="dimmed">
                  <IconCalendar size={12} style={{ marginRight: 4 }} />
                  {formatDate(snippet.updatedAt)}
                </Text>
              </Group>

              {snippet.description && (
                <Text size="sm" c="dimmed" lineClamp={2}>
                  {snippet.description}
                </Text>
              )}

              {tags.length > 0 && (
                <Group gap={4}>
                  {tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="dot" size="xs">
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > 3 && (
                    <Text size="xs" c="dimmed">
                      +{tags.length - 3} more
                    </Text>
                  )}
                </Group>
              )}

              <Box style={{ maxHeight: 120, overflow: 'hidden' }}>
                <CodeHighlight
                  code={getCodePreview(snippet.code, 3)}
                  language={snippet.language}
                  withCopyButton={false}
                  styles={{
                    root: {
                      fontSize: '12px',
                    },
                    pre: {
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowX: 'hidden',
                    },
                    code: {
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    },
                  }}
                />
              </Box>
            </Stack>

            <Group gap="xs">
              <Tooltip label="Copy code">
                <ActionIcon variant="light" color="blue" onClick={() => onCopyCode(snippet.code)}>
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label={snippet.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <ActionIcon variant="light" color="red" onClick={() => onToggleFavorite(snippet)}>
                  {snippet.isFavorite ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                </ActionIcon>
              </Tooltip>

              <Menu withinPortal position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="light">
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconEdit size={14} />} onClick={(e) => handleCardClick(e, CardAction.EDIT)}>
                    Edit
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={(e) => handleCardClick(e, CardAction.DELETE)}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>          </Group>
        </Card>
        <EditSnippetModal
          opened={usageModalOpen}
          onClose={() => setUsageModalOpen(false)}
          snippet={snippet}
          onSave={handleSaveNotes}
          onToggleFavorite={() => onToggleFavorite(snippet)}
          onAddTag={(tag) => console.log('Add tag:', tag)}
          onRemoveTag={(tag) => console.log('Remove tag:', tag)}
        />
      </>
    );
  }

  // Grid view
  return (
    <>
      <Card
        withBorder
        shadow="sm"
        radius="md"
        p="md"
        h="100%"
        onClick={(e) => handleCardClick(e, CardAction.EDIT)}
        style={{ cursor: 'pointer' }}
      >
        <Stack gap="xs" h="100%">
          <Group justify="space-between" align="flex-start">
            <Group gap="xs" style={{ flex: 1 }}>
              <Text fw={600} lineClamp={1} style={{ flex: 1 }}>
                {snippet.title}
              </Text>
              {snippet.isFavorite && <IconHeartFilled size={16} style={{ color: 'var(--mantine-color-red-6)' }} />}
            </Group>

            <Menu withinPortal position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="light" size="sm">
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={(e) => handleCardClick(e, CardAction.EDIT)}>
                  Edit
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={(e) => handleCardClick(e, CardAction.DELETE)}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Group gap="xs">
            {languageIcon && <Image src={languageIcon} alt={snippet.language} width={14} height={14} />}
            <Badge variant="light" size="xs">
              {snippet.language}
            </Badge>
          </Group>

          {snippet.description && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {snippet.description}
            </Text>
          )}

          <Box style={{ flex: 1, overflow: 'hidden' }}>
            <CodeHighlight
              code={getCodePreview(snippet.code, 4)}
              language={snippet.language}
              withCopyButton={false}
              styles={{
                root: {
                  fontSize: '11px',
                  maxHeight: '140px',
                  overflow: 'hidden',
                },
                pre: {
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowX: 'hidden',
                },
                code: {
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                },
              }}
            />
          </Box>

          {tags.length > 0 && (
            <Group gap={4}>
              {tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="dot" size="xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Text size="xs" c="dimmed">
                  +{tags.length - 2}
                </Text>
              )}
            </Group>
          )}

          <Group justify="space-between" align="center" mt="auto">
            <Text size="xs" c="dimmed">
              {formatDate(snippet.updatedAt)}
            </Text>

            <Group gap={4}>
              <Tooltip label="Copy code">
                <ActionIcon variant="light" color="blue" size="sm" onClick={() => onCopyCode(snippet.code)}>
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label={snippet.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <ActionIcon variant="light" color="red" size="sm" onClick={() => onToggleFavorite(snippet)}>
                  {snippet.isFavorite ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Stack>      </Card>
      <EditSnippetModal
        opened={usageModalOpen}
        onClose={() => setUsageModalOpen(false)}
        snippet={snippet}
        onSave={handleSaveNotes}
        onToggleFavorite={() => onToggleFavorite(snippet)}
        onAddTag={(tag) => console.log('Add tag:', tag)}
        onRemoveTag={(tag) => console.log('Remove tag:', tag)}
      />
    </>
  );
}
