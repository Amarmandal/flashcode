import { Modal, Text, Button, Group } from '@mantine/core';

type ConfirmationModalProps = {
  opened: boolean;
  close: () => void;
  confirmRemove: () => void;
  title?: string;
  message?: string;
};

const ConfirmationModal = ({
  opened,
  close,
  confirmRemove,
  title = 'Remove from favorites?',
  message = 'Are you sure you want to remove this deck from favorites?',
}: ConfirmationModalProps) => {
  return (
    <Modal opened={opened} onClose={close} title={title}>
      <Text>{message}</Text>
      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button color="red" onClick={confirmRemove}>
          Remove
        </Button>
      </Group>
    </Modal>
  );
};

export default ConfirmationModal;
