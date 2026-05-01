import { Modal, TextInput, Button, Stack, Group } from '@mantine/core';
import { useForm } from '@mantine/form';

interface NormalDeckFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  initialName?: string;
}

export function NormalDeckForm({ opened, onClose, onSubmit, initialName }: NormalDeckFormProps) {
  const form = useForm({
    initialValues: { name: initialName || '' },
    validate: { name: (v: string) => (v.trim().length === 0 ? 'Deck name is required' : null) },
  });

  const handleSubmit = (values: { name: string }) => {
    onSubmit(values.name.trim());
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={initialName ? 'Edit Deck' : 'Create Normal Deck'} centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput label="Deck Name" placeholder="e.g. Biology Terms" {...form.getInputProps('name')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initialName ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
