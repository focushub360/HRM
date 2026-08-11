import { Router } from 'express';
import {
  addTask,
  getTasks,
  updateTaskStatus,
  getUserTasks,
  getProjectTasks
} from '../controllers/taskController.js';

const router = Router();

router.post('/', addTask);
router.get('/user/:empId', getUserTasks);
router.get('/project/:projectId', getProjectTasks);
router.get('/:companyId', getTasks);
router.put('/:id', updateTaskStatus);

export default router;