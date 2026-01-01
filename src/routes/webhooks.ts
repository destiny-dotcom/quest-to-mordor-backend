import { Router } from 'express';
import { appleHealthWebhook } from '../controllers/webhookController';

const router = Router();

// POST /api/webhooks/apple-health - Receive step data from Apple Shortcut
// Authentication: X-Apple-Health-API-Key header (per-user API key)
router.post('/apple-health', appleHealthWebhook);

export default router;
