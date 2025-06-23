import {
  Card,
  Stack,
  TextInput,
  Grid,
  Select,
  Text,
  Group,
  Chip,
  SegmentedControl,
  ActionIcon,
  Badge,
  Button,
  Image,
} from '@mantine/core';
import {
  IconSearch,
  IconFilter,
  IconFolder,
  IconSortAscending,
  IconSortDescending,
  IconGrid3x3,
  IconList,
  IconHeart,
} from '@tabler/icons-react';
import { SnippetFolder } from '../../types/snippet';
import { LANGUAGES, languageIcons } from '../../assets/language-constants';

const SORT_OPTIONS = [
  { value: 'date_modified', label: 'Last Modified' },
  { value: 'date_created', label: 'Date Created' },
  { value: 'name', label: 'Name' },
  { value: 'language', label: 'Language' },
];

interface LibraryFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (value: string) => void;
  selectedFolder: number | null;
  setSelectedFolder: (value: number | null) => void;
  showFavorites: boolean;
  setShowFavorites: (value: boolean) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (value: 'grid' | 'list') => void;
  folders: SnippetFolder[];
  clearFilters: () => void;
}

export function LibraryFilters({
  searchQuery,
  setSearchQuery,
  selectedLanguage,
  setSelectedLanguage,
  selectedFolder,
  setSelectedFolder,
  showFavorites,
  setShowFavorites,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  folders,
  clearFilters,
}: LibraryFiltersProps) {
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <Card withBorder p="md">
      <Stack gap="md">
        {/* Search Bar */}
        <TextInput
          placeholder="Search snippets..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ flex: 1 }}
        />

        {/* Filter Controls */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Language"
              placeholder="All Languages"
              data={LANGUAGES}
              value={selectedLanguage}
              onChange={(value) => setSelectedLanguage(value || '')}
              leftSection={
                selectedLanguage && languageIcons[selectedLanguage] ? (
                  <Image src={languageIcons[selectedLanguage]} alt={selectedLanguage} width={16} height={16} />
                ) : (
                  <IconFilter size={16} />
                )
              }
              clearable
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Folder"
              placeholder="All Folders"
              data={[
                { value: '', label: 'All Folders' },
                ...folders.map((folder) => ({
                  value: folder.id.toString(),
                  label: folder.name,
                })),
              ]}
              value={selectedFolder?.toString() || ''}
              onChange={(value) => setSelectedFolder(value ? parseInt(value) : null)}
              leftSection={<IconFolder size={16} />}
              clearable
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Sort by"
              data={SORT_OPTIONS}
              value={sortBy}
              onChange={(value) => setSortBy(value || 'date_modified')}
              rightSection={
                <ActionIcon variant="transparent" onClick={toggleSortOrder}>
                  {sortOrder === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
                </ActionIcon>
              }
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Text size="sm" fw={500} mb="xs">
              View
            </Text>
            <Group gap="md">
              <Chip
                checked={showFavorites}
                onChange={setShowFavorites}
                variant="light"
                color="red"
                size="sm"
              >
                <Group gap={4}>
                  <IconHeart size={14} />
                  Favorites
                </Group>
              </Chip>
              <SegmentedControl
                value={viewMode}
                onChange={(value) => setViewMode(value as 'grid' | 'list')}
                data={[
                  { label: <IconGrid3x3 size={16} />, value: 'grid' },
                  { label: <IconList size={16} />, value: 'list' },
                ]}
                size="sm"
              />
            </Group>
          </Grid.Col>
        </Grid>

        {/* Active Filters */}
        {(searchQuery || selectedLanguage || selectedFolder || showFavorites) && (
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Active filters:
            </Text>
            {searchQuery && (
              <Badge variant="light" color="blue">
                Search: "{searchQuery}"
              </Badge>
            )}
            {selectedLanguage && (
              <Badge variant="light" color="green">
                Language: {LANGUAGES.find((l) => l.value === selectedLanguage)?.label}
              </Badge>
            )}
            {selectedFolder && (
              <Badge variant="light" color="orange">
                Folder: {folders.find((f) => f.id === selectedFolder)?.name}
              </Badge>
            )}
            {showFavorites && (
              <Badge variant="light" color="red">
                Favorites
              </Badge>
            )}
            <Button variant="subtle" size="xs" onClick={clearFilters}>
              Clear all
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
