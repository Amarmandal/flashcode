import { Card, Text } from '@mantine/core';

interface StatusCardProps {
  label: string;
  count: number;
  color: string;
}

export function StatusCard({ label, count, color }: StatusCardProps) {
  return (
    <Card withBorder shadow="sm" radius="md" p="lg" bg={`${color}.0`} style={{ textAlign: 'center' }}>
      <Text size="lg" fw={600} c="black">
        {label}
      </Text>
      <Text size="xl" fw={700} c={color}>
        {count}
      </Text>
    </Card>
  );
}
