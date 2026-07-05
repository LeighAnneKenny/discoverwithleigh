-- Editable site content: one JSON blob per section key
CREATE TABLE content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Gallery images stored in R2, categories as JSON array
CREATE TABLE gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL UNIQUE,
  categories TEXT NOT NULL DEFAULT '[]',
  sort INTEGER NOT NULL DEFAULT 0,
  -- natural dimensions, avoids layout shift when rendering plain <img>
  w INTEGER NOT NULL,
  h INTEGER NOT NULL
);

-- Brand logos stored in R2
CREATE TABLE brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0,
  w INTEGER NOT NULL,
  h INTEGER NOT NULL
);
