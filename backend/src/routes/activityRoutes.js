import { Router } from 'express';
import { logActivity, deleteActivity, getActivityLogsByUser } from '../controllers/activityController.js';

const router = Router();

router.post('/', logActivity);
router.delete('/:id', deleteActivity);
router.get('/:empId', getActivityLogsByUser);

export default router;