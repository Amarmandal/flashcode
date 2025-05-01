import { Card, Container, Group, Stack, Text, Title, Button, MantineColor } from '@mantine/core';
import { IconConfetti, IconArrowBackUp } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface CongratulationsProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  iconColor?: MantineColor;
  buttonText?: string;
  onReset?: () => void;
  className?: string;
}

const defaultProps = {
  title: 'Congratulations!',
  message: 'You have completed all cards for today.',
  buttonText: 'Back to Deck',
  iconColor: '#1c7ed6',
};

export function Congratulations({
  title = defaultProps.title,
  message = defaultProps.message,
  icon = <IconConfetti size={48} color={defaultProps.iconColor} />,
  buttonText = defaultProps.buttonText,
  onReset,
  className,
}: CongratulationsProps) {
  return (
    <Container size="sm" py="xl" className={className}>
      <Card withBorder shadow="md" radius="lg" p="xl">
        <Stack align="center" gap="md">
          <Group align="center" mt="md">
            {icon}
          </Group>
          <Title order={2} ta="center">
            {title}
          </Title>
          <Text size="lg" ta="center" c="dimmed">
            {message}
          </Text>
          {onReset && (
            <Button leftSection={<IconArrowBackUp size={20} />} color="teal" size="md" mt="md" onClick={onReset}>
              {buttonText}
            </Button>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
