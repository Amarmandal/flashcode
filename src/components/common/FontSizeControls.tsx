import { ActionIcon, Group, Text, rem } from '@mantine/core';
import { IconMinus, IconPlus } from '@tabler/icons-react';

interface FontSizeControlsProps {
  fontSize: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onReset: () => void;
}

function FontSizeControls({ fontSize, onIncrease, onDecrease }: FontSizeControlsProps) {
  return (
    <Group gap="xs" justify="flex-end">
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={onDecrease}
        aria-label="Decrease font size"
        disabled={fontSize <= 12}
      >
        <IconMinus style={{ width: rem(16), height: rem(16) }} />
      </ActionIcon>
      <Text size="sm" fw={500} style={{ minWidth: rem(40), textAlign: 'center' }}>
        {fontSize}px
      </Text>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={onIncrease}
        aria-label="Increase font size"
        disabled={fontSize >= 24}
      >
        <IconPlus style={{ width: rem(16), height: rem(16) }} />
      </ActionIcon>
    </Group>
  );
}

export default FontSizeControls;
