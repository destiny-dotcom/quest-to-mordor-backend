export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  total_steps: number;
  total_miles: number;
  current_milestone_id: string | null;
  apple_health_api_key: string | null;
  apple_health_api_key_created_at: Date | null;
  apple_health_last_sync_at: Date | null;
  apple_health_sync_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  total_steps: number;
  total_miles: number;
  current_milestone_id: string | null;
  created_at: Date;
}

export interface Milestone {
  id: string;
  name: string;
  description: string | null;
  distance_from_start: number;
  order_index: number;
  image_url: string | null;
  quote: string | null;
  created_at: Date;
}

export interface Step {
  id: string;
  user_id: string;
  step_count: number;
  miles: number;
  recorded_date: Date;
  source: 'manual' | 'apple_watch' | 'fitbit' | 'google_fit';
  created_at: Date;
  updated_at: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  requirement_type: 'milestone' | 'steps' | 'streak' | 'special';
  requirement_value: number | null;
  created_at: Date;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: Date;
}

export interface UserMilestone {
  id: string;
  user_id: string;
  milestone_id: string;
  reached_at: Date;
}

// API Request/Response Types
export interface CreateUserRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
}

export interface LogStepsRequest {
  step_count: number;
  recorded_date: string; // ISO date string (YYYY-MM-DD)
  source?: string;
}

export interface ProgressResponse {
  user: UserPublic;
  current_milestone: Milestone | null;
  next_milestone: Milestone | null;
  milestones_reached: Milestone[];
  total_steps: number;
  total_miles: number;
  progress_to_next: number; // Percentage 0-100
  journey_progress: number; // Percentage 0-100 of total journey
}

// Apple Health Sync Types
export interface AppleHealthSyncStatus {
  enabled: boolean;
  hasApiKey: boolean;
  lastSyncAt: string | null;
  apiKeyCreatedAt: string | null;
}

export interface GenerateApiKeyResponse {
  apiKey: string;
  createdAt: string;
}

export interface AppleHealthWebhookRequest {
  step: {
    step_count: number;
    recorded_date: string;
  };
}

// Constants
export const STEPS_PER_MILE = 2000;
export const TOTAL_JOURNEY_MILES = 1779;
