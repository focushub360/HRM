import { Router } from 'express';
import { logInactivityAlert } from '../controllers/inactivityController.js';

const router = Router();
router.post('/', logInactivityAlert);

export default router;