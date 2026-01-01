-- Quest to Mordor - Apple Health Sync
-- Migration: 003_apple_health_sync
-- Created: 2025-01-01

-- Add Apple Health sync columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS apple_health_api_key VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS apple_health_api_key_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS apple_health_last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS apple_health_sync_enabled BOOLEAN DEFAULT FALSE;

-- Index for API key lookup (used in webhook authentication)
CREATE INDEX IF NOT EXISTS idx_users_apple_health_api_key ON users(apple_health_api_key) WHERE apple_health_api_key IS NOT NULL;

-- Update Step source enum to include 'apple_health'
-- Note: The source column is VARCHAR so no enum update needed, but we document valid values:
-- Valid sources: 'manual', 'apple_watch', 'apple_health', 'fitbit', 'google_fit'
COMMENT ON COLUMN steps.source IS 'Source of step data: manual, apple_watch, apple_health, fitbit, google_fit';
