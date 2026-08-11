import { Router } from 'express';
import { logProctoringData } from '../controllers/proctoringController.js';

const router = Router();
router.post('/log', logProctoringData);

export default router;