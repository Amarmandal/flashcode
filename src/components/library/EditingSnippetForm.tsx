import { useState } from 'react';
import { Modal, Group, Box, Button, Text as MantineText, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import { IconCopy, IconX, IconStar, IconStarFilled, IconEdit } from '@tabler/icons-react';

interface UsageNotesModalProps {
  opened: boolean;
  onClose: () => void;
  code: string;
  language: string;
  title: string;
  initialNotes: string;
  onSave: (notes: string) => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  readOnly?: boolean;
}

export function UsageNotesModal({
  opened,
  onClose,
  code,
  language,
  title,
  initialNotes,
  onSave,
  onToggleFavorite,
  isFavorite,
  createdAt,
  updatedAt,
  tags = [],
  onAddTag,
  onRemoveTag,
  readOnly,
}: UsageNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      UnderlineExtension,
      LinkExtension,
    ],
    content: notes,
    editable: !readOnly && isEditingNotes,
    onUpdate: ({ editor }) => setNotes(editor.getHTML()),
  });

  const handleSave = () => {
    onSave(notes);
    setIsEditingNotes(false);
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
    navigator.clipboard.writeText(code);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Group justify="space-between" w="100%">
          <Group>
            <MantineText fw={600} size="lg">
              {title}
            </MantineText>
          </Group>
          <Group>
            {onToggleFavorite && (
              <ActionIcon variant="subtle" color={isFavorite ? 'yellow' : 'gray'} onClick={onToggleFavorite}>
                {isFavorite ? <IconStarFilled size={20} /> : <IconStar size={20} />}
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
      <Group align="flex-start" gap="xl" wrap="nowrap" style={{ height: '70vh' }}>
        {/* Code Section - Left Side */}
        <Box style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Group justify="space-between" mb="xs">
            <MantineText fw={500} size="sm" c="dimmed">
              Language: {language}
            </MantineText>
            <Group gap="xs">
              <Tooltip label="Copy Code">
                <ActionIcon variant="light" color="blue" size="sm" onClick={handleCopyCode}>
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>
              <Button variant="light" size="compact-xs">
                Toggle Line Numbers
              </Button>
              <Button variant="light" size="compact-xs">
                Fullscreen
              </Button>
            </Group>
          </Group>
          <Box style={{ flex: 1, overflow: 'auto' }}>
            <CodeHighlight code={code} language={language} withCopyButton={false} />
          </Box>
        </Box>

        {/* Usage Notes Section - Right Side */}
        <Box style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Group justify="space-between" mb="xs">
            <MantineText fw={500}>Usage Notes</MantineText>
            <ActionIcon variant="light" size="sm" onClick={() => setIsEditingNotes(!isEditingNotes)}>
              <IconEdit size={14} />
            </ActionIcon>
          </Group>

          {/* Rich Text Editor */}
          <Box style={{ flex: 1, marginBottom: '1rem' }}>
            <RichTextEditor
              editor={editor}
              style={{
                minHeight: 250,
                background: 'var(--mantine-color-gray-9)',
                borderRadius: 8,
                border: '1px solid var(--mantine-color-gray-6)',
              }}
            >
              {isEditingNotes && (
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
              )}
              <RichTextEditor.Content />
            </RichTextEditor>

            {isEditingNotes && (
              <Group justify="flex-end" mt="xs">
                <Button size="xs" onClick={handleSave}>
                  Save Notes
                </Button>
              </Group>
            )}
          </Box>

          {/* Tags Section */}
          <Box mb="md">
            <MantineText fw={500} size="sm" mb="xs">
              Tags
            </MantineText>
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
        </Box>
      </Group>

      {/* Footer */}
      <Group justify="space-between" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-6)' }}>
        <Group gap="lg">
          <MantineText size="xs" c="dimmed">
            Created: {formatDate(createdAt)}
          </MantineText>
          <MantineText size="xs" c="dimmed">
            Last modified: {formatDate(updatedAt)}
          </MantineText>
        </Group>
      </Group>
    </Modal>
  );
}
