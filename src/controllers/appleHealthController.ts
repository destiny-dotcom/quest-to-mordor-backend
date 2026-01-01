import { Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/database';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppleHealthSyncStatus, GenerateApiKeyResponse } from '../models/types';

/**
 * Get Apple Health sync status for the authenticated user
 */
export const getStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const result = await query(
      `SELECT
        apple_health_api_key IS NOT NULL as has_api_key,
        apple_health_sync_enabled as enabled,
        apple_health_last_sync_at as last_sync_at,
        apple_health_api_key_created_at as api_key_created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const row = result.rows[0];
    const status: AppleHealthSyncStatus = {
      enabled: row.enabled || false,
      hasApiKey: row.has_api_key || false,
      lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : null,
      apiKeyCreatedAt: row.api_key_created_at ? row.api_key_created_at.toISOString() : null,
    };

    res.json(status);
  } catch (error) {
    logger.error('Get Apple Health status error', error);
    res.status(500).json({ error: 'Failed to get Apple Health status' });
  }
};

/**
 * Generate a new API key for Apple Health webhook
 * The key is only returned once - user must copy it immediately
 */
export const generateKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    // Generate a secure 32-byte (256-bit) API key
    const apiKey = crypto.randomBytes(32).toString('base64url');
    const createdAt = new Date();

    // Update user with new API key and enable sync
    await query(
      `UPDATE users SET
        apple_health_api_key = $1,
        apple_health_api_key_created_at = $2,
        apple_health_sync_enabled = true,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [apiKey, createdAt, userId]
    );

    logger.info(`Apple Health API key generated for user ${userId}`);

    const response: GenerateApiKeyResponse = {
      apiKey,
      createdAt: createdAt.toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Generate Apple Health API key error', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
};

/**
 * Revoke the current API key (invalidates it immediately)
 */
export const revokeKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    await query(
      `UPDATE users SET
        apple_health_api_key = NULL,
        apple_health_api_key_created_at = NULL,
        apple_health_sync_enabled = false,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    logger.info(`Apple Health API key revoked for user ${userId}`);

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    logger.error('Revoke Apple Health API key error', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};

/**
 * Enable Apple Health sync (requires existing API key)
 */
export const enableSync = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const result = await query(
      `UPDATE users SET
        apple_health_sync_enabled = true,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND apple_health_api_key IS NOT NULL
       RETURNING
        apple_health_api_key IS NOT NULL as has_api_key,
        apple_health_sync_enabled as enabled,
        apple_health_last_sync_at as last_sync_at,
        apple_health_api_key_created_at as api_key_created_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'No API key exists. Generate one first.' });
      return;
    }

    const row = result.rows[0];
    const status: AppleHealthSyncStatus = {
      enabled: row.enabled,
      hasApiKey: row.has_api_key,
      lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : null,
      apiKeyCreatedAt: row.api_key_created_at ? row.api_key_created_at.toISOString() : null,
    };

    res.json(status);
  } catch (error) {
    logger.error('Enable Apple Health sync error', error);
    res.status(500).json({ error: 'Failed to enable sync' });
  }
};

/**
 * Disable Apple Health sync (keeps API key for re-enabling)
 */
export const disableSync = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const result = await query(
      `UPDATE users SET
        apple_health_sync_enabled = false,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING
        apple_health_api_key IS NOT NULL as has_api_key,
        apple_health_sync_enabled as enabled,
        apple_health_last_sync_at as last_sync_at,
        apple_health_api_key_created_at as api_key_created_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const row = result.rows[0];
    const status: AppleHealthSyncStatus = {
      enabled: row.enabled,
      hasApiKey: row.has_api_key,
      lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : null,
      apiKeyCreatedAt: row.api_key_created_at ? row.api_key_created_at.toISOString() : null,
    };

    res.json(status);
  } catch (error) {
    logger.error('Disable Apple Health sync error', error);
    res.status(500).json({ error: 'Failed to disable sync' });
  }
};
