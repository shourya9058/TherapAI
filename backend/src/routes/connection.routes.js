import { Router } from 'express';
import { recordConnection, checkConnection } from '../controllers/connection.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All connection routes are protected
router.use(protect);

// @route   POST /api/connections/record
router.post('/record', recordConnection);

// @route   GET /api/connections/check/:partnerId
router.get('/check/:partnerId', checkConnection);

export default router;
