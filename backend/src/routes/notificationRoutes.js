import { Router } from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';

const router = Router();

router.get('/:recipientId', getNotifications);
router.put('/:id/read', markAsRead);

export default router;
