import { Card, Text } from '@mantine/core';

interface StatusCardProps {
  label: string;
  count: number;
  color: string;
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: {
    bg: 'rgba(59, 130, 246, 0.08)',
    text: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  orange: {
    bg: 'rgba(217, 119, 6, 0.08)',
    text: '#d97706',
    border: 'rgba(217, 119, 6, 0.3)',
  },
  green: {
    bg: 'rgba(5, 150, 105, 0.08)',
    text: '#059669',
    border: 'rgba(5, 150, 105, 0.3)',
  },
};

export function StatusCard({ label, count, color }: StatusCardProps) {
  const colors = colorMap[color] || colorMap.blue;

  return (
    <Card
      radius="lg"
      p="xl"
      style={{
        textAlign: 'center',
        background: 'var(--surface-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `2px solid ${colors.border}`,
        transition: 'transform 0.2s ease',
      }}
    >
      <Text
        size="xs"
        fw={600}
        c="var(--text-tertiary)"
        tt="uppercase"
        style={{ letterSpacing: '1px' }}
      >
        {label}
      </Text>
      <Text size="3rem" fw={700} mt={8} style={{ color: colors.text }}>
        {count}
      </Text>
    </Card>
  );
}
