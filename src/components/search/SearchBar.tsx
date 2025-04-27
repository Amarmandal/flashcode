import { useState } from 'react';
import { Input, Stack, Paper, Text, Group, ActionIcon } from '@mantine/core';
import { IconSearch, IconX, IconCards } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  type: string;
  cardCount?: number;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  const handleSearch = async (searchQuery: string) => {
    const mockResults: SearchResult[] = [
      {
        id: '1',
        title: 'JavaScript Basics',
        type: 'deck',
        cardCount: 24,
      },
      {
        id: '2',
        title: 'React Hooks',
        type: 'deck',
        cardCount: 12,
      },
      {
        id: '3',
        title: 'What is a closure?',
        type: 'flashcard',
      },
    ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

    setResults(mockResults);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'deck') {
      navigate(`/deck/${result.id}`);
    } else {
      navigate(`/flashcard/${result.id}`);
    }
    setQuery('');
    setResults([]);
  };

  return (
    <Stack gap={0} style={{ position: 'relative' }}>
      <Group>
        <Input
          placeholder="Search..."
          radius="md"
          size="md"
          w={{ base: '100%', sm: 400, md: 600 }}
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            handleSearch(e.currentTarget.value);
          }}
          leftSection={<IconSearch size={16} />}
        />
        {query && (
          <ActionIcon
            variant="transparent"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            styles={{
              root: {
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                cursor: 'pointer',
              },
            }}
          >
            <IconX size={16} />
          </ActionIcon>
        )}
      </Group>

      {query && results.length > 0 && (
        <Paper
          shadow="md"
          p="md"
          bg="dark.6"
          styles={{
            root: {
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              maxHeight: '400px',
              overflowY: 'auto',
            },
          }}
        >
          <Stack gap="xs">
            {results.map((result) => (
              <Paper
                key={`${result.type}-${result.id}`}
                p="sm"
                withBorder
                bg="dark.5"
                style={{ cursor: 'pointer' }}
                onClick={() => handleResultClick(result)}
              >
                <Group justify="space-between">
                  <Text fw={500}>{result.title}</Text>
                  {result.type === 'deck' && (
                    <Group gap={4}>
                      <IconCards size={14} />
                      <Text size="sm" c="dimmed">
                        {result.cardCount}
                      </Text>
                    </Group>
                  )}
                </Group>
                <Text size="xs" c="dimmed" mt={4}>
                  {result.type === 'deck' ? 'Deck' : 'Flashcard'}
                </Text>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {query && results.length === 0 && (
        <Paper
          shadow="md"
          p="md"
          bg="dark.6"
          styles={{
            root: {
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
            },
          }}
        >
          <Text c="dimmed">No results found</Text>
        </Paper>
      )}
    </Stack>
  );
}
