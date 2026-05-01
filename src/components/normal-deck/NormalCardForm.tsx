import { Modal, Textarea, Button, Stack, Group } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import { useForm } from '@mantine/form';
import { useState } from 'react';

interface NormalCardFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (front: string, back: string) => void;
}

export function NormalCardForm({ opened, onClose, onSubmit }: NormalCardFormProps) {
  const [backHtml, setBackHtml] = useState('');

  const form = useForm({
    initialValues: { front: '' },
    validate: {
      front: (v: string) => (v.trim().length === 0 ? 'Front is required' : null),
    },
  });

  const editor = useEditor({
    extensions: [StarterKit, UnderlineExtension, LinkExtension],
    content: '',
    onUpdate: ({ editor }) => setBackHtml(editor.getHTML()),
  });

  const handleSubmit = (values: { front: string }) => {
    if (!backHtml || backHtml === '<p></p>') return;
    onSubmit(values.front.trim(), backHtml);
    form.reset();
    editor?.commands.clearContent();
    setBackHtml('');
    onClose();
  };

  const handleClose = () => {
    form.reset();
    editor?.commands.clearContent();
    setBackHtml('');
    onClose();
  };

  const backEmpty = !backHtml || backHtml === '<p></p>';

  return (
    <Modal opened={opened} onClose={handleClose} title="Add Card" centered size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Textarea
            label="Front"
            description="What should prompt your recall?"
            placeholder="e.g. Which CSS property allows long lines to wrap inside a <pre> block?"
            rows={3}
            {...form.getInputProps('front')}
          />

          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Back</div>
            <div style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)', marginBottom: 6 }}>
              Full answer — paste MCQ options, plain text, or anything you'd write in Anki.
            </div>
            <RichTextEditor editor={editor} style={{ minHeight: 180 }}>
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
                  minHeight: 140,
                  background: 'var(--mantine-color-dark-7)',
                  fontSize: 14,
                }}
              />
            </RichTextEditor>
            {backEmpty && form.isDirty() && (
              <div style={{ color: 'var(--mantine-color-red-6)', fontSize: 12, marginTop: 4 }}>
                Back is required
              </div>
            )}
          </div>

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={backEmpty}>Add Card</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
