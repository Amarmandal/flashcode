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
    <Modal opened={opened} onClose={onClose} title={initialName ? 'Edit Deck' : 'Create Deck'}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput label="Deck Name" placeholder="Enter deck name" {...form.getInputProps('name')} />
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{initialName ? 'Update' : 'Create'}</Button>
        </Group>
      </form>
    </Modal>
  );
}
