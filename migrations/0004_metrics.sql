-- Bounded behaviour counters (PRD item 11): one row per (day, metric),
-- upsert-incremented by /api/metrics, pruned past 35 days on write.
-- Ceiling ≈ 15 metrics × 35 days ≈ 500 rows.
CREATE TABLE metrics (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)
);
