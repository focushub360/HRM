import { Router } from 'express';
import {
  getMessages,
  sendMessage,
  deleteMessage,
  markRead,
  markDelivered
} from '../controllers/chatController.js';

const router = Router();

router.get('/messages', getMessages);
router.post('/messages', sendMessage);
router.delete('/messages/:id', deleteMessage);
router.patch('/messages/read', markRead);
router.post('/messages/:id/delivered', markDelivered);

export default router;