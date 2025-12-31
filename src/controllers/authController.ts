import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { generateToken } from '../middleware/auth';
import logger from '../utils/logger';
import { CreateUserRequest, LoginRequest, UserPublic } from '../models/types';

const SALT_ROUNDS = 12;

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, display_name }: CreateUserRequest = req.body;

  if (!email || !password || !display_name) {
    res.status(400).json({ error: 'Email, password, and display name are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  try {
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, avatar_url, total_steps, total_miles, current_milestone_id, created_at`,
      [email.toLowerCase(), passwordHash, display_name]
    );

    const user: UserPublic = result.rows[0];
    const token = generateToken(user.id, user.email);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      user,
      token
    });
  } catch (error) {
    logger.error('Registration error', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password }: LoginRequest = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await query(
      `SELECT id, email, password_hash, display_name, avatar_url, total_steps, total_miles, current_milestone_id, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id, user.email);

    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      total_steps: user.total_steps,
      total_miles: user.total_miles,
      current_milestone_id: user.current_milestone_id,
      created_at: user.created_at
    };

    logger.info(`User logged in: ${user.email}`);

    res.json({
      user: userPublic,
      token
    });
  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as { userId?: string }).userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const result = await query(
      `SELECT id, email, display_name, avatar_url, total_steps, total_miles, current_milestone_id, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.error('Get profile error', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};
