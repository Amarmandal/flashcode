import { Button, Container } from '@mantine/core';
import { IconCompass } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
export const NotFoundPage = () => <Container py="xl"><EmptyState title="This page has moved" description="Let's get you back to your learning space." icon={<IconCompass size={28} />} action={<Button component={Link} to="/" mt="md">Back to code decks</Button>} /></Container>;
