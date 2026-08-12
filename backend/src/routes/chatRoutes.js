import { Router } from 'express';
import { getMessages, sendMessage, deleteMessage } from '../controllers/chatController.js';

const router = Router();

router.get('/messages', getMessages);
router.post('/messages', sendMessage);
router.delete('/messages/:id', deleteMessage);

export default router;
