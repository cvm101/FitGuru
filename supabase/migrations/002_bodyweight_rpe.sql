-- Migration 002: Body weight tracking + workout set enhancements
-- Run this in Supabase SQL Editor after 001_init.sql

-- ─── Body weight logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  date        DATE NOT NULL,
  weight_kg   NUMERIC(5,2) NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS body_weight_logs_user_date
  ON body_weight_logs(user_id, date);

ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weight logs"
  ON body_weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Enhance workout_sets: add RPE + notes ────────────────────────────────────
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS rpe     NUMERIC(3,1);  -- 1–10 scale
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS notes   TEXT;

-- ─── Indexes for common queries ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS body_weight_logs_user_date_idx
  ON body_weight_logs(user_id, date DESC);
