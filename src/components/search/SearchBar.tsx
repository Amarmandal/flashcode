import { useState, useEffect, useCallback } from 'react';
import { Input, Stack, Paper, Text, Group, ActionIcon } from '@mantine/core';
import { IconSearch, IconX, IconCards } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { SuccessApiResponse } from '../../types/successApiResponse';

interface SearchResult {
  id: string;
  title: string;
  entityType: 'Card' | 'Deck';
  cardCount: number;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await invoke<SuccessApiResponse<SearchResult[]>>('search', { keyword: searchQuery });

      const mappedResults: SearchResult[] = (response.data || []).map((item) => {
        return {
          id: String(item.id),
          title: item.title,
          entityType: item.entityType === 'Deck' ? 'Deck' : 'Card',
          cardCount: typeof item.cardCount === 'number' ? item.cardCount : 0,
        };
      });
      setResults(mappedResults);
      setError(null);
    } catch (err) {
      setResults([]);
      setError('Failed to search.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce the search function
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleSearch = async (searchQuery: string) => {
    // This function is now just for updating the query state
    // The actual search is handled by the useEffect with debouncing
    setQuery(searchQuery);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.entityType === 'Deck') {
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
          radius="sm"
          size="md"
          w={{ base: '100%', sm: 400, md: 600 }}
          value={query}
          onChange={(e) => {
            handleSearch(e.currentTarget.value);
          }}
          leftSection={<IconSearch size={16} />}
          disabled={isLoading}
          styles={{
            input: {
              background: 'var(--input-bg)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            },
          }}
        />
        {query && (
          <ActionIcon
            variant="transparent"
            onClick={() => {
              setQuery('');
              setResults([]);
              setError(null);
              setIsLoading(false);
            }}
            styles={{
              root: {
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              },
            }}
          >
            <IconX size={16} />
          </ActionIcon>
        )}
      </Group>

      {query && error && (
        <Paper
          p="md"
          radius="md"
          styles={{
            root: {
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--surface-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--surface-border)',
            },
          }}
        >
          <Text c="red">{error}</Text>
        </Paper>
      )}

      {query && !error && results.length > 0 && (
        <Paper
          p="md"
          radius="md"
          styles={{
            root: {
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 100,
              maxHeight: '400px',
              overflowY: 'auto',
              background: 'var(--surface-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--surface-border)',
            },
          }}
        >
          <Stack gap="xs">
            {results.map((result) => (
              <Paper
                key={`${result.entityType}-${result.id}`}
                p="sm"
                radius="sm"
                style={{
                  cursor: 'pointer',
                  background: 'rgba(15, 23, 42, 0.03)',
                  border: '1px solid var(--border-color)',
                }}
                onClick={() => handleResultClick(result)}
              >
                <Group justify="space-between">
                  <Text fw={500} c="var(--text-primary)">{result.title}</Text>
                  {result.entityType === 'Deck' && (
                    <Group gap={4}>
                      <IconCards size={14} color="var(--text-secondary)" />
                      <Text size="sm" c="var(--text-secondary)">
                        {result.cardCount}
                      </Text>
                    </Group>
                  )}
                </Group>
                <Text size="xs" c="var(--text-tertiary)" mt={4}>
                  {result.entityType === 'Deck' ? 'Deck' : 'Flashcard'}
                </Text>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {query && !error && results.length === 0 && (
        <Paper
          p="md"
          radius="md"
          styles={{
            root: {
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--surface-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--surface-border)',
            },
          }}
        >
          <Text c="var(--text-secondary)">No results found</Text>
        </Paper>
      )}
    </Stack>
  );
}
