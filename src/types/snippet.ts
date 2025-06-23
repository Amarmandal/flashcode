export interface Snippet {
  id: number;
  title: string;
  code: string;
  language: string;
  description?: string;
  tags?: string;
  isFavorite: boolean;
  folderId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SnippetFolder {
  id: number;
  name: string;
  parentId?: number;
  createdAt: string;
}

export interface SnippetQueryParams {
  page?: number;
  limit?: number;
  language?: string;
  isFavorite?: string;
  folderId?: number;
  search?: string;
  sortBy?: 'name' | 'date_created' | 'date_modified' | 'language';
  sortOrder?: 'asc' | 'desc';
}

export interface SnippetFormData {
  title: string;
  code: string;
  language: string;
  description?: string;
  tags?: string[];
  folderId?: number;
}
