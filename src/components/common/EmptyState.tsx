import { ReactNode } from 'react';
import { Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCards } from '@tabler/icons-react';
import classes from './Page.module.css';
interface EmptyStateProps { title: string; description: string; icon?: ReactNode; action?: ReactNode; }
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return <Paper className={classes.empty} radius="lg">
    <Stack align="center" gap="sm">
      <ThemeIcon size={58} radius="lg" variant="light" mb="sm">{icon || <IconCards size={28} stroke={1.5} />}</ThemeIcon>
      <Title order={3}>{title}</Title>
      <Text c="dimmed" size="sm" maw={360} ta="center" lh={1.65}>{description}</Text>
      {action}
    </Stack>
  </Paper>;
}
