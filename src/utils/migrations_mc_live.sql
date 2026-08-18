-- Database migration for MC Live Management
-- To be executed in the Supabase SQL editor

-- 1. Create MC Tiers Table
CREATE TABLE IF NOT EXISTS mc_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create MC List Table
CREATE TABLE IF NOT EXISTS mc_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tier_id UUID NOT NULL REFERENCES mc_tiers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active' or 'Inactive'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add mc_id Column to Bookings Table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mc_id UUID REFERENCES mc_list(id) ON DELETE SET NULL;

-- 4. Seed Default Tiers (if not already seeded)
INSERT INTO mc_tiers (name, sort_order)
VALUES 
  ('Tier A', 1),
  ('Tier B', 2),
  ('Tier C', 3)
ON CONFLICT (name) DO NOTHING;
