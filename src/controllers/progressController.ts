import { Response } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { TOTAL_JOURNEY_MILES } from '../models/types';

export const getProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    // Get user with current milestone
    const userResult = await query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.total_steps, u.total_miles,
              u.current_milestone_id, u.created_at,
              m.name as current_milestone_name, m.description as current_milestone_description,
              m.distance_from_start as current_milestone_distance, m.order_index as current_milestone_order,
              m.quote as current_milestone_quote
       FROM users u
       LEFT JOIN milestones m ON u.current_milestone_id = m.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    const totalMiles = parseFloat(user.total_miles) || 0;

    // Get next milestone
    const nextMilestoneResult = await query(
      `SELECT id, name, description, distance_from_start, order_index, quote
       FROM milestones
       WHERE distance_from_start > $1
       ORDER BY distance_from_start ASC
       LIMIT 1`,
      [totalMiles]
    );

    // Get all reached milestones
    const reachedMilestonesResult = await query(
      `SELECT m.id, m.name, m.description, m.distance_from_start, m.order_index, m.quote, um.reached_at
       FROM user_milestones um
       JOIN milestones m ON um.milestone_id = m.id
       WHERE um.user_id = $1
       ORDER BY m.order_index ASC`,
      [userId]
    );

    // Calculate progress
    const currentMilestone = user.current_milestone_id ? {
      id: user.current_milestone_id,
      name: user.current_milestone_name,
      description: user.current_milestone_description,
      distance_from_start: parseFloat(user.current_milestone_distance),
      order_index: user.current_milestone_order,
      quote: user.current_milestone_quote
    } : null;

    const nextMilestone = nextMilestoneResult.rows.length > 0 ? nextMilestoneResult.rows[0] : null;

    // Calculate progress to next milestone
    let progressToNext = 0;
    if (nextMilestone && currentMilestone) {
      const distanceBetween = parseFloat(nextMilestone.distance_from_start) - currentMilestone.distance_from_start;
      const distanceTraveled = totalMiles - currentMilestone.distance_from_start;
      progressToNext = Math.min(100, Math.round((distanceTraveled / distanceBetween) * 100));
    } else if (nextMilestone) {
      // No current milestone yet, calculate from start
      progressToNext = Math.min(100, Math.round((totalMiles / parseFloat(nextMilestone.distance_from_start)) * 100));
    }

    // Calculate overall journey progress
    const journeyProgress = Math.min(100, Math.round((totalMiles / TOTAL_JOURNEY_MILES) * 100 * 100) / 100);

    // Calculate miles remaining
    const milesRemaining = Math.max(0, TOTAL_JOURNEY_MILES - totalMiles);
    const milesToNextMilestone = nextMilestone
      ? Math.max(0, parseFloat(nextMilestone.distance_from_start) - totalMiles)
      : 0;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        total_steps: parseInt(user.total_steps, 10),
        total_miles: Math.round(totalMiles * 100) / 100,
        created_at: user.created_at
      },
      journey: {
        current_milestone: currentMilestone,
        next_milestone: nextMilestone,
        milestones_reached: reachedMilestonesResult.rows,
        milestones_reached_count: reachedMilestonesResult.rows.length,
        progress_to_next_milestone: progressToNext,
        miles_to_next_milestone: Math.round(milesToNextMilestone * 100) / 100,
        journey_progress_percent: journeyProgress,
        total_journey_miles: TOTAL_JOURNEY_MILES,
        miles_remaining: Math.round(milesRemaining * 100) / 100
      }
    });
  } catch (error) {
    logger.error('Get progress error', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
};

export const getMilestones = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, description, distance_from_start, order_index, image_url, quote
       FROM milestones
       ORDER BY order_index ASC`
    );

    res.json({
      milestones: result.rows,
      total_journey_miles: TOTAL_JOURNEY_MILES
    });
  } catch (error) {
    logger.error('Get milestones error', error);
    res.status(500).json({ error: 'Failed to get milestones' });
  }
};

export const getAchievements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    // Get all achievements with unlock status for user
    const result = await query(
      `SELECT a.id, a.name, a.description, a.icon_url, a.requirement_type, a.requirement_value,
              ua.unlocked_at,
              CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
       ORDER BY a.requirement_type, a.requirement_value`,
      [userId]
    );

    const unlocked = result.rows.filter(a => a.unlocked);

    res.json({
      achievements: result.rows,
      unlocked_count: unlocked.length,
      total_count: result.rows.length,
      progress_percent: Math.round((unlocked.length / result.rows.length) * 100)
    });
  } catch (error) {
    logger.error('Get achievements error', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
};
