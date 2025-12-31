-- Quest to Mordor - Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2025-12-31

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    total_steps BIGINT DEFAULT 0,
    total_miles DECIMAL(10, 2) DEFAULT 0,
    current_milestone_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- MILESTONES TABLE (LOTR Journey Locations)
-- ============================================
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    distance_from_start DECIMAL(10, 2) NOT NULL, -- Miles from Bag End
    order_index INTEGER NOT NULL,
    image_url VARCHAR(500),
    quote TEXT, -- Famous LOTR quote for this location
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_order ON milestones(order_index);
CREATE INDEX idx_milestones_distance ON milestones(distance_from_start);

-- ============================================
-- STEPS TABLE (Daily Step Records)
-- ============================================
CREATE TABLE IF NOT EXISTS steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_count INTEGER NOT NULL,
    miles DECIMAL(10, 2) NOT NULL,
    recorded_date DATE NOT NULL,
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'apple_watch', 'fitbit', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recorded_date)
);

CREATE INDEX idx_steps_user_id ON steps(user_id);
CREATE INDEX idx_steps_recorded_date ON steps(recorded_date);
CREATE INDEX idx_steps_user_date ON steps(user_id, recorded_date);

-- ============================================
-- ACHIEVEMENTS TABLE (Unlockable Badges)
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500),
    requirement_type VARCHAR(50) NOT NULL, -- 'milestone', 'steps', 'streak', 'special'
    requirement_value INTEGER, -- e.g., milestone_order, step_count, streak_days
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER_ACHIEVEMENTS TABLE (Junction Table)
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================
-- USER_MILESTONES TABLE (Track Reached Milestones)
-- ============================================
CREATE TABLE IF NOT EXISTS user_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    reached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, milestone_id)
);

CREATE INDEX idx_user_milestones_user ON user_milestones(user_id);

-- ============================================
-- Add foreign key for current_milestone_id
-- ============================================
ALTER TABLE users
ADD CONSTRAINT fk_users_current_milestone
FOREIGN KEY (current_milestone_id) REFERENCES milestones(id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to steps table
CREATE TRIGGER update_steps_updated_at
    BEFORE UPDATE ON steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
