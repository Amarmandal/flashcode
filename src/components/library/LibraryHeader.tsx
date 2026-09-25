import { Badge, Button } from '@mantine/core';
import { IconFolder, IconPlus } from '@tabler/icons-react';
import { PageHeader } from '../common/PageHeader';
interface LibraryHeaderProps { totalCount: number; onAddSnippet: () => void; onAddFolder: () => void; }
export function LibraryHeader({ totalCount, onAddSnippet, onAddFolder }: LibraryHeaderProps) {
  return <PageHeader title={<>Snippet library <Badge color="brand" ml="sm">{totalCount} {totalCount === 1 ? 'snippet' : 'snippets'}</Badge></>}
    eyebrow="Your personal reference" description="Useful code, ready when you need it. Save a snippet once and find it fast."
    actions={<><Button variant="default" leftSection={<IconFolder size={16} />} onClick={onAddFolder}>New folder</Button><Button leftSection={<IconPlus size={16} />} onClick={onAddSnippet}>Add snippet</Button></>} />;
}
