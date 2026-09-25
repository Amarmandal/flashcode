import { Card, Group, Text, ThemeIcon } from '@mantine/core';
import { IconCircle, IconRepeat, IconSparkles } from '@tabler/icons-react';
interface StatusCardProps { label: string; count: number; color: string; }
export function StatusCard({ label, count, color }: StatusCardProps) {
  const Icon = color === 'blue' ? IconSparkles : color === 'orange' ? IconCircle : IconRepeat;
  return <Card p="lg"><Group justify="space-between" wrap="nowrap"><Text size="xs" fw={600} c="dimmed">{label}</Text><ThemeIcon variant="light" color={color} size={28}><Icon size={15} /></ThemeIcon></Group><Text size="2rem" fw={650} mt="sm" lh={1.2}>{count}</Text></Card>;
}
