import { Card, Text } from '@mantine/core';

interface StatusCardProps {
  label: string;
  count: number;
  color: string;
}

export function StatusCard({ label, count, color }: StatusCardProps) {
  return (
    <Card
      radius="md"
      p="lg"
      style={{
        textAlign: 'center',
        border: `2px solid var(--mantine-color-${color}-6)`,
      }}
    >
      <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
        {label}
      </Text>
      <Text size="2rem" fw={800} c={color} mt={4}>
        {count}
      </Text>
    </Card>
  );
}
