import { ReactNode } from 'react';
import { Box, Group, Text, Title } from '@mantine/core';
import classes from './Page.module.css';

interface PageHeaderProps { title: ReactNode; description?: string; eyebrow?: string; actions?: ReactNode; }
export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return <Group className={classes.header} justify="space-between" align="flex-start" gap="lg">
    <Box className={classes.heading}>
      {eyebrow && <Text className={classes.eyebrow}>{eyebrow}</Text>}
      <Title order={1} className={classes.title}>{title}</Title>
      {description && <Text className={classes.description}>{description}</Text>}
    </Box>
    {actions && <Group gap="sm" className={classes.actions}>{actions}</Group>}
  </Group>;
}
