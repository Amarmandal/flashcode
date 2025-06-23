import { Grid, Flex, Text } from '@mantine/core';
import { Snippet } from '../../types/snippet';
import { SnippetCard } from './SnippetCard';
import { NoData } from '../common/NoData';
import {
  bashIcon,
  cppIcon,
  goIcon,
  javaIcon,
  javascriptIcon,
  phpIcon,
  pythonIcon,
  rustIcon,
  swiftIcon,
  typescriptIcon,
} from '../../assets/language-icons';

const languageIcons: Record<string, string> = {
  rust: rustIcon,
  javascript: javascriptIcon,
  python: pythonIcon,
  java: javaIcon,
  cpp: cppIcon,
  go: goIcon,
  typescript: typescriptIcon,
  php: phpIcon,
  swift: swiftIcon,
  bash: bashIcon,
};

interface LibraryContentProps {
  snippets: Snippet[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
  onToggleFavorite: (snippet: Snippet) => void;
  onCopyCode: (code: string) => void;
}

export function LibraryContent({
  snippets,
  loading,
  viewMode,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyCode,
}: LibraryContentProps) {
  if (loading) {
    return (
      <Flex align="center" justify="center" h={200}>
        <Text>Loading snippets...</Text>
      </Flex>
    );
  }

  if (snippets.length === 0) {
    return <NoData message="No snippets found. Create your first snippet to get started!" />;
  }

  return (
    <Grid gutter="md">
      {snippets.map((snippet) => (
        <Grid.Col key={snippet.id} span={viewMode === 'grid' ? { base: 12, sm: 6, lg: 4 } : 12}>
          <SnippetCard
            snippet={snippet}
            viewMode={viewMode}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onCopyCode={onCopyCode}
            languageIcon={languageIcons[snippet.language]}
          />
        </Grid.Col>
      ))}
    </Grid>
  );
}
