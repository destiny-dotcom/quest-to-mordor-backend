import { Router } from 'express';
import { logSteps, getSteps, getTodaySteps } from '../controllers/stepsController';
import { getProgress, getMilestones, getAchievements } from '../controllers/progressController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/steps - Log steps for a day
router.post('/', logSteps);

// GET /api/steps - Get step history (with optional date filters)
router.get('/', getSteps);

// GET /api/steps/today - Get today's steps
router.get('/today', getTodaySteps);

// GET /api/steps/progress - Get full journey progress
router.get('/progress', getProgress);

// GET /api/steps/milestones - Get all LOTR milestones
router.get('/milestones', getMilestones);

// GET /api/steps/achievements - Get user's achievements
router.get('/achievements', getAchievements);

export default router;
