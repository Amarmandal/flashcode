import { IconDatabaseOff } from '@tabler/icons-react';
import { Text, Center, Box } from '@mantine/core';

interface NoDataProps {
  message?: string;
  iconSize?: number;
}

export function NoData({ message = 'No Data', iconSize = 80 }: NoDataProps) {
  return (
    <Center mih={200}>
      <Box ta="center">
        <IconDatabaseOff size={iconSize} stroke={1.5} style={{ opacity: 0.5, marginBottom: 16 }} />
        <Text c="dimmed" size="lg">
          {message}
        </Text>
      </Box>
    </Center>
  );
}
