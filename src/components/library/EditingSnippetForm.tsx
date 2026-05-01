import { useState } from 'react';
import { Modal, Group, Box, Button, Text as MantineText, Badge, ActionIcon, Tooltip, Tabs } from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import { IconCopy, IconStar, IconStarFilled } from '@tabler/icons-react';
import { Snippet } from '../../types/snippet';
import { htmlDecode } from '../../pages/StudyNowPage';

interface EditSnippetModalProps {
  opened: boolean;
  onClose: () => void;
  snippet: Snippet;
  onSave: (notes: string) => void;
  onToggleFavorite?: () => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}

export function EditSnippetModal({
  opened,
  onClose,
  snippet,
  onSave,
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
}: EditSnippetModalProps) {
  const [notes, setNotes] = useState(snippet.description || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension,
    ],
    content: notes,
    editable: true,
    onUpdate: ({ editor }) => {
      setNotes(editor.getHTML());
      setHasUnsavedChanges(true);
    },
    onFocus: () => {
      setHasUnsavedChanges(true);
    },
  });

  const parseTags = (tagsString?: string): string[] => {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
    } catch {
      return [];
    }
  };

  const tags = parseTags(snippet.tags);
  const handleSave = () => {
    onSave(notes);
    setHasUnsavedChanges(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  const handleCopyCode = () => {
    navigator.clipboard.writeText(snippet.code);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="75vw"
      title={
        <Group justify="space-between" w="100%">
          <Group>
            <MantineText fw={600} size="lg">
              {snippet.title}
            </MantineText>
          </Group>
          <Group>
            {onToggleFavorite && (
              <ActionIcon variant="subtle" color={snippet.isFavorite ? 'yellow' : 'gray'} onClick={onToggleFavorite}>
                {snippet.isFavorite ? <IconStarFilled size={20} /> : <IconStar size={20} />}
              </ActionIcon>
            )}
          </Group>
        </Group>
      }
      centered
      styles={{
        title: { width: '100%' },
        header: { padding: '1rem' },
      }}
    >
      <Tabs defaultValue="code" style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <Tabs.List mb="sm">
          <Tabs.Tab value="code">Code</Tabs.Tab>
          <Tabs.Tab value="notes">
            Notes {hasUnsavedChanges && <Badge size="xs" circle color="blue" ml={4} />}
          </Tabs.Tab>
          <Tabs.Tab value="details">Details</Tabs.Tab>
        </Tabs.List>

        {/* Code Tab */}
        <Tabs.Panel value="code" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Group justify="space-between" mb="xs">
            <MantineText size="sm" c="dimmed">
              Language: {snippet.language}
            </MantineText>
            <Group gap="xs">
              <Tooltip label="Copy code">
                <ActionIcon variant="light" color="blue" size="sm" onClick={handleCopyCode}>
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Box style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
            <CodeHighlight
              code={htmlDecode(snippet.code)}
              language={snippet.language}
              withCopyButton={false}
              styles={{
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
        </Tabs.Panel>

        {/* Notes Tab */}
        <Tabs.Panel value="notes" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box style={{ flex: 1, overflowY: 'auto' }}>
            <RichTextEditor editor={editor} style={{ background: 'transparent' }}>
              <RichTextEditor.Toolbar sticky stickyOffset={0}>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.Underline />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.BulletList />
                  <RichTextEditor.OrderedList />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Code />
                  <RichTextEditor.Link />
                </RichTextEditor.ControlsGroup>
              </RichTextEditor.Toolbar>
              <RichTextEditor.Content
                style={{
                  minHeight: 300,
                  background: 'var(--mantine-color-dark-7)',
                  borderRadius: 8,
                  color: 'var(--mantine-color-white)',
                  fontSize: 14,
                }}
              />
            </RichTextEditor>
          </Box>
          <Group justify="flex-end" mt="xs">
            <Button size="xs" onClick={handleSave} disabled={!hasUnsavedChanges}>
              {hasUnsavedChanges ? 'Save Notes' : 'Saved'}
            </Button>
          </Group>
        </Tabs.Panel>

        {/* Details Tab */}
        <Tabs.Panel value="details" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Box mb="lg">
            <MantineText fw={500} size="sm" mb="xs">Tags</MantineText>
            <Group gap="xs">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="light"
                  size="sm"
                  style={{ cursor: onRemoveTag ? 'pointer' : 'default' }}
                  onClick={() => onRemoveTag?.(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {onAddTag && (
                <Button
                  variant="light"
                  size="compact-xs"
                  onClick={() => {
                    const tag = prompt('Enter tag name:');
                    if (tag) onAddTag(tag);
                  }}
                >
                  + Add Tag
                </Button>
              )}
            </Group>
          </Box>
          <Box>
            <MantineText fw={500} size="sm" mb="xs">Info</MantineText>
            <Group gap="lg">
              <MantineText size="xs" c="dimmed">Created: {formatDate(snippet.createdAt)}</MantineText>
              <MantineText size="xs" c="dimmed">Last modified: {formatDate(snippet.updatedAt)}</MantineText>
            </Group>
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
