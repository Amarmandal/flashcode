import { useState, useEffect } from 'react';
import { Container, Stack, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { Snippet, SnippetFolder, SnippetQueryParams } from '../types/snippet';
import { SuccessApiResponse } from '../types/successApiResponse';
import { LibraryHeader } from '../components/library/LibraryHeader';
import { LibraryFilters } from '../components/library/LibraryFilters';
import { LibraryContent } from '../components/library/LibraryContent';
import { SnippetForm } from '../components/library/SnippetForm';
import { FolderForm } from '../components/library/FolderForm';
import ConfirmationModal from '../components/common/ConfirmationModal';

export default function LibraryPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [folders, setFolders] = useState<SnippetFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date_modified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [isSnippetFormOpen, setIsSnippetFormOpen] = useState(false);
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [deleteSnippet, setDeleteSnippet] = useState<Snippet | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchSnippets = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: SnippetQueryParams = {
        page,
        limit,
        search: searchQuery || undefined,
        language: selectedLanguage || undefined,
        folderId: selectedFolder || undefined,
        isFavorite: showFavorites ? 'true' : undefined,
        sortBy: sortBy as any,
        sortOrder,
      };

      const response = await invoke<SuccessApiResponse<Snippet[]>>('get_all_snippets', {
        queryParams,
      });

      if (response.success) {
        setSnippets(response.data);
        setTotalCount(response.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch snippets:', err);
      setError('Failed to load snippets');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await invoke<SuccessApiResponse<SnippetFolder[]>>('get_snippet_folders');
      if (response.success) {
        setFolders(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, [page, searchQuery, selectedLanguage, selectedFolder, showFavorites, sortBy, sortOrder]);

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleAddSnippet = () => {
    setEditingSnippet(null);
    setIsSnippetFormOpen(true);
  };

  const handleEditSnippet = (snippet: Snippet) => {
    setEditingSnippet(snippet);
  };

  const handleDeleteSnippet = (snippet: Snippet) => {
    setDeleteSnippet(snippet);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSnippet = async () => {
    if (!deleteSnippet) return;

    try {
      await invoke('delete_snippet', { id: deleteSnippet.id });
      fetchSnippets();
      setIsDeleteModalOpen(false);
      setDeleteSnippet(null);
    } catch (err) {
      console.error('Failed to delete snippet:', err);
      setError('Failed to delete snippet');
    }
  };

  const handleToggleFavorite = async (snippet: Snippet) => {
    try {
      const updatedSnippet = { ...snippet, isFavorite: !snippet.isFavorite };
      await invoke('update_snippet', { snippet: updatedSnippet });
      fetchSnippets();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      setError('Failed to update snippet');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      // You could add a notification here
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleSnippetFormSuccess = () => {
    setIsSnippetFormOpen(false);
    setEditingSnippet(null);
    fetchSnippets();
  };

  const handleFolderFormSuccess = () => {
    setIsFolderFormOpen(false);
    fetchFolders();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLanguage('');
    setSelectedFolder(null);
    setShowFavorites(false);
    setPage(1);
  };

  const filterProps = {
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
  };

  return (
    <Container size="xl" py="md">
      {error && (
        <Alert
          variant="light"
          color="red"
          title="Error"
          icon={<IconAlertCircle size="1rem" />}
          onClose={() => setError(null)}
          withCloseButton
          mb="md"
        >
          {error}
        </Alert>
      )}

      <Stack gap="md">
        <LibraryHeader
          totalCount={totalCount}
          onAddSnippet={handleAddSnippet}
          onAddFolder={() => setIsFolderFormOpen(true)}
        />

        <LibraryFilters {...filterProps} />

        <LibraryContent
          snippets={snippets}
          loading={loading}
          viewMode={viewMode}
          onEdit={handleEditSnippet}
          onDelete={handleDeleteSnippet}
          onToggleFavorite={handleToggleFavorite}
          onCopyCode={handleCopyCode}
        />
      </Stack>

      {/* Modals */}
      <SnippetForm
        opened={isSnippetFormOpen}
        onClose={() => {
          setIsSnippetFormOpen(false);
          setEditingSnippet(null);
        }}
        snippet={editingSnippet}
        folders={folders}
        onSuccess={handleSnippetFormSuccess}
      />

      <FolderForm
        opened={isFolderFormOpen}
        onClose={() => setIsFolderFormOpen(false)}
        folders={folders}
        onSuccess={handleFolderFormSuccess}
      />

      <ConfirmationModal
        opened={isDeleteModalOpen}
        close={() => {
          setIsDeleteModalOpen(false);
          setDeleteSnippet(null);
        }}
        confirmRemove={confirmDeleteSnippet}
        title="Delete Snippet?"
        message={'Are you sure you want to delete? This action cannot be undone.'}
      />
    </Container>
  );
}
