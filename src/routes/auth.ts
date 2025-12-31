import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/register - Create new user account
router.post('/register', register);

// POST /api/auth/login - Authenticate user and get token
router.post('/login', login);

// GET /api/auth/profile - Get current user profile (protected)
router.get('/profile', authenticate, getProfile);

export default router;
