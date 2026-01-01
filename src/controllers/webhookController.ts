import { Request, Response } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';
import { STEPS_PER_MILE } from '../models/types';

// Rate limiting: track requests per API key
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // Max requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

/**
 * Webhook endpoint for Apple Shortcut to submit step data
 * Authentication via X-Apple-Health-API-Key header
 */
export const appleHealthWebhook = async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers['x-apple-health-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  // Rate limiting check
  const now = Date.now();
  const rateLimit = rateLimitMap.get(apiKey);

  if (rateLimit) {
    if (now > rateLimit.resetAt) {
      // Reset the window
      rateLimitMap.set(apiKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    } else if (rateLimit.count >= RATE_LIMIT_MAX) {
      logger.warn(`Rate limit exceeded for API key: ${apiKey.substring(0, 8)}...`);
      res.status(429).json({
        error: 'Rate limit exceeded. Maximum 10 requests per hour.',
        retryAfter: Math.ceil((rateLimit.resetAt - now) / 1000)
      });
      return;
    } else {
      rateLimit.count++;
    }
  } else {
    rateLimitMap.set(apiKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }

  try {
    // Find user by API key and verify sync is enabled
    const userResult = await query(
      `SELECT id, email, apple_health_sync_enabled
       FROM users
       WHERE apple_health_api_key = $1`,
      [apiKey]
    );

    if (userResult.rows.length === 0) {
      logger.warn(`Invalid API key attempted: ${apiKey.substring(0, 8)}...`);
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const user = userResult.rows[0];

    if (!user.apple_health_sync_enabled) {
      res.status(403).json({ error: 'Apple Health sync is disabled for this account' });
      return;
    }

    // Validate request body
    const { step } = req.body;

    if (!step || typeof step !== 'object') {
      res.status(400).json({ error: 'Invalid request body. Expected { step: { step_count, recorded_date } }' });
      return;
    }

    const { step_count, recorded_date } = step;

    if (!step_count || typeof step_count !== 'number' || step_count < 0) {
      res.status(400).json({ error: 'Valid step_count is required (positive number)' });
      return;
    }

    if (!recorded_date) {
      res.status(400).json({ error: 'recorded_date is required (YYYY-MM-DD format)' });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(recorded_date)) {
      res.status(400).json({ error: 'recorded_date must be in YYYY-MM-DD format' });
      return;
    }

    // Check for existing entry on this date
    const existingResult = await query(
      `SELECT id, source FROM steps WHERE user_id = $1 AND recorded_date = $2`,
      [user.id, recorded_date]
    );

    const miles = step_count / STEPS_PER_MILE;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      if (existing.source !== 'apple_health') {
        // Manual entry exists - don't overwrite
        res.status(409).json({
          error: 'Manual entry exists for this date',
          existingSource: existing.source,
          message: 'Apple Health sync will not overwrite manual entries'
        });
        return;
      }

      // Update existing Apple Health entry (idempotent)
      const updateResult = await query(
        `UPDATE steps SET
          step_count = $1,
          miles = $2,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, user_id, step_count, miles, recorded_date, source, created_at, updated_at`,
        [step_count, miles, existing.id]
      );

      // Update user totals and last sync time
      await updateUserTotals(user.id);

      logger.info(`Apple Health sync updated for user ${user.email}: ${step_count} steps on ${recorded_date}`);

      res.json({
        step: updateResult.rows[0],
        action: 'updated'
      });
    } else {
      // Create new entry
      const insertResult = await query(
        `INSERT INTO steps (user_id, step_count, miles, recorded_date, source)
         VALUES ($1, $2, $3, $4, 'apple_health')
         RETURNING id, user_id, step_count, miles, recorded_date, source, created_at, updated_at`,
        [user.id, step_count, miles, recorded_date]
      );

      // Update user totals and last sync time
      await updateUserTotals(user.id);

      logger.info(`Apple Health sync created for user ${user.email}: ${step_count} steps on ${recorded_date}`);

      res.status(201).json({
        step: insertResult.rows[0],
        action: 'created'
      });
    }
  } catch (error) {
    logger.error('Apple Health webhook error', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Helper function to update user totals and milestones after step sync
 */
async function updateUserTotals(userId: string): Promise<void> {
  try {
    // Update user's total steps, miles, and last sync time
    await query(
      `UPDATE users SET
        total_steps = (SELECT COALESCE(SUM(step_count), 0) FROM steps WHERE user_id = $1),
        total_miles = (SELECT COALESCE(SUM(miles), 0) FROM steps WHERE user_id = $1),
        apple_health_last_sync_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    // Update milestones
    await updateUserMilestones(userId);
  } catch (error) {
    logger.error('Update user totals error', error);
  }
}

/**
 * Helper function to update user milestones based on total miles
 */
async function updateUserMilestones(userId: string): Promise<void> {
  try {
    const userResult = await query(
      'SELECT total_miles FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const totalMiles = parseFloat(userResult.rows[0].total_miles);

    const milestonesResult = await query(
      `SELECT id, order_index FROM milestones
       WHERE distance_from_start <= $1
       ORDER BY order_index DESC`,
      [totalMiles]
    );

    if (milestonesResult.rows.length === 0) return;

    // Insert any new milestones (ignore duplicates)
    for (const milestone of milestonesResult.rows) {
      await query(
        `INSERT INTO user_milestones (user_id, milestone_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, milestone_id) DO NOTHING`,
        [userId, milestone.id]
      );
    }

    // Update user's current milestone
    const currentMilestone = milestonesResult.rows[0];
    await query(
      'UPDATE users SET current_milestone_id = $1 WHERE id = $2',
      [currentMilestone.id, userId]
    );
  } catch (error) {
    logger.error('Update milestones error', error);
  }
}
