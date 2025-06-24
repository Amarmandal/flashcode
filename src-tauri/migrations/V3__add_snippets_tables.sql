-- Add snippet_folders table
CREATE TABLE IF NOT EXISTS snippet_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES snippet_folders(id) ON DELETE CASCADE
);

-- Add snippets table
CREATE TABLE IF NOT EXISTS snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON string of tags array
    is_favorite BOOLEAN NOT NULL DEFAULT 0,
    folder_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES snippet_folders(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language);
CREATE INDEX IF NOT EXISTS idx_snippets_is_favorite ON snippets(is_favorite);
CREATE INDEX IF NOT EXISTS idx_snippets_folder_id ON snippets(folder_id);
CREATE INDEX IF NOT EXISTS idx_snippets_updated_at ON snippets(updated_at);
