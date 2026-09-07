-- Migration 003: Persist the active workout program on the user's account
-- Run this in Supabase SQL Editor after 002_bodyweight_rpe.sql
--
-- Before this, the active program lived only in device storage (localStorage on
-- web), so it was lost on a new browser, device, or deployment URL.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_split_id         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_split_started_on DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS week_restart_at         TIMESTAMPTZ;
