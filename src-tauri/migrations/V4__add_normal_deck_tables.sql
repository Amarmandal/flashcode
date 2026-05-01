CREATE TABLE IF NOT EXISTS normal_decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  deck_category TEXT NOT NULL DEFAULT 'normal',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS normal_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL REFERENCES normal_decks(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK(card_type IN ('mcq', 'qa', 'text')),
  front TEXT,
  back TEXT,
  content TEXT,
  question TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option TEXT CHECK(correct_option IN ('a', 'b', 'c', 'd')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_normal_cards_deck_id ON normal_cards (deck_id);
