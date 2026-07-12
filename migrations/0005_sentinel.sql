-- Dedupe ledger for quota-sentinel alerts (PRD item 15): one row per quota per
-- period ('YYYY-MM-DD' for daily quotas, 'YYYY-MM' for monthly) so the hourly
-- cron emails once per breach, not once per hour.
CREATE TABLE sentinel_alerts (
  period TEXT NOT NULL,
  quota TEXT NOT NULL,
  PRIMARY KEY (period, quota)
);
