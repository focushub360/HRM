import { Router } from 'express';
import { getCompanyFeed, addPost, toggleLikePost, addComment, deletePost } from '../controllers/feedController.js';

const router = Router();

router.post('/', addPost);
router.get('/:companyId', getCompanyFeed);
router.post('/:postId/like', toggleLikePost);
router.post('/:postId/comment', addComment);
router.delete('/:postId', deletePost);

export default router;