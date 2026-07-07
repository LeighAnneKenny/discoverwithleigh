-- Brand tiles: optional text label + per-tile visibility toggle (PRD item 4b)
ALTER TABLE brands ADD COLUMN label TEXT NOT NULL DEFAULT '';
ALTER TABLE brands ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
