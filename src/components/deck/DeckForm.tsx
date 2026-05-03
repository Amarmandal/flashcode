import { Modal, TextInput, Button, Group } from '@mantine/core';
import { useForm } from '@mantine/form';

interface DeckFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  initialName?: string;
}

export function DeckForm({ opened, onClose, onSubmit, initialName }: DeckFormProps) {
  const form = useForm({
    initialValues: {
      name: initialName || '',
    },
    validate: {
      name: (value: string) => (value.trim().length > 0 ? null : 'Deck name is required'),
    },
  });

  const handleSubmit = (values: { name: string }) => {
    onSubmit(values.name);
    form.reset();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialName ? 'Edit Deck' : 'Create Deck'}
      centered
      radius="lg"
      styles={{
        content: {
          background: 'var(--surface-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--surface-border)',
        },
        title: {
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary)',
        },
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Deck Name"
          placeholder="e.g. React Hooks"
          {...form.getInputProps('name')}
          styles={{
            input: {
              background: 'var(--input-bg)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            },
            label: {
              color: 'var(--text-primary)',
              fontWeight: 500,
              marginBottom: '8px',
            },
          }}
        />
        <Group justify="flex-end" mt="lg" gap="sm">
          <Button
            variant="subtle"
            onClick={onClose}
            radius="sm"
            color="gray"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            radius="sm"
            styles={{
              root: {
                background: 'var(--primary-btn-bg)',
                color: 'var(--primary-btn-text)',
              },
            }}
          >
            {initialName ? 'Update' : 'Create'}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
