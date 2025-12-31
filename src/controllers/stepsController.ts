import { Response } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { STEPS_PER_MILE } from '../models/types';

export const logSteps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;
  const { step_count, recorded_date, source = 'manual' } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!step_count || step_count < 0) {
    res.status(400).json({ error: 'Valid step count is required' });
    return;
  }

  if (!recorded_date) {
    res.status(400).json({ error: 'Recorded date is required (YYYY-MM-DD)' });
    return;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(recorded_date)) {
    res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    return;
  }

  try {
    const miles = step_count / STEPS_PER_MILE;

    // Upsert: insert or update if date already exists
    const result = await query(
      `INSERT INTO steps (user_id, step_count, miles, recorded_date, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, recorded_date)
       DO UPDATE SET step_count = $2, miles = $3, source = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_id, step_count, miles, recorded_date, source, created_at, updated_at`,
      [userId, step_count, miles, recorded_date, source]
    );

    // Update user's total steps and miles
    await query(
      `UPDATE users SET
         total_steps = (SELECT COALESCE(SUM(step_count), 0) FROM steps WHERE user_id = $1),
         total_miles = (SELECT COALESCE(SUM(miles), 0) FROM steps WHERE user_id = $1),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    // Check and update milestones
    await updateUserMilestones(userId);

    logger.info(`Steps logged for user ${userId}: ${step_count} steps on ${recorded_date}`);

    res.status(201).json({
      step: result.rows[0],
      message: 'Steps logged successfully'
    });
  } catch (error) {
    logger.error('Log steps error', error);
    res.status(500).json({ error: 'Failed to log steps' });
  }
};

export const getSteps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;
  const { start_date, end_date, limit = '30' } = req.query;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    let queryText = `
      SELECT id, step_count, miles, recorded_date, source, created_at
      FROM steps
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (start_date) {
      queryText += ` AND recorded_date >= $${paramIndex}`;
      params.push(start_date as string);
      paramIndex++;
    }

    if (end_date) {
      queryText += ` AND recorded_date <= $${paramIndex}`;
      params.push(end_date as string);
      paramIndex++;
    }

    queryText += ` ORDER BY recorded_date DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string, 10));

    const result = await query(queryText, params);

    // Calculate totals for the period
    const totalSteps = result.rows.reduce((sum, row) => sum + parseInt(row.step_count, 10), 0);
    const totalMiles = result.rows.reduce((sum, row) => sum + parseFloat(row.miles), 0);

    res.json({
      steps: result.rows,
      summary: {
        total_steps: totalSteps,
        total_miles: Math.round(totalMiles * 100) / 100,
        record_count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Get steps error', error);
    res.status(500).json({ error: 'Failed to get steps' });
  }
};

export const getTodaySteps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT id, step_count, miles, recorded_date, source, created_at
       FROM steps
       WHERE user_id = $1 AND recorded_date = $2`,
      [userId, today]
    );

    if (result.rows.length === 0) {
      res.json({
        step: null,
        message: 'No steps logged today yet'
      });
      return;
    }

    res.json({ step: result.rows[0] });
  } catch (error) {
    logger.error('Get today steps error', error);
    res.status(500).json({ error: 'Failed to get today\'s steps' });
  }
};

// Helper function to update user milestones based on total miles
async function updateUserMilestones(userId: string): Promise<void> {
  try {
    // Get user's total miles
    const userResult = await query(
      'SELECT total_miles FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const totalMiles = parseFloat(userResult.rows[0].total_miles);

    // Get all milestones the user should have reached
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

    // Update user's current milestone to the furthest one reached
    const currentMilestone = milestonesResult.rows[0];
    await query(
      'UPDATE users SET current_milestone_id = $1 WHERE id = $2',
      [currentMilestone.id, userId]
    );

  } catch (error) {
    logger.error('Update milestones error', error);
  }
}
