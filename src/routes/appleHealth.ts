import { Router } from 'express';
import {
  getStatus,
  generateKey,
  revokeKey,
  enableSync,
  disableSync
} from '../controllers/appleHealthController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require JWT authentication
router.use(authenticate);

// GET /api/apple-health/status - Get sync status
router.get('/status', getStatus);

// POST /api/apple-health/generate-key - Generate new API key
router.post('/generate-key', generateKey);

// DELETE /api/apple-health/revoke-key - Revoke current API key
router.delete('/revoke-key', revokeKey);

// POST /api/apple-health/enable - Enable sync (requires existing key)
router.post('/enable', enableSync);

// POST /api/apple-health/disable - Disable sync (keeps key)
router.post('/disable', disableSync);

export default router;
