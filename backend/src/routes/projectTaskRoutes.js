import { Router } from 'express';
import {
  addProjectTask,
  getProjectTasks,
  updateProjectTask,
  deleteProjectTask
} from '../controllers/taskController.js';

const router = Router();

// POST   /api/project-tasks           -> create a project task
router.post('/', addProjectTask);

// GET    /api/project-tasks/:projectId -> fetch tasks for a project
router.get('/:projectId', getProjectTasks);

// PUT    /api/project-tasks/:taskId    -> update a task (status change OR full edit)
//        THIS WAS MISSING — the frontend was calling this and silently getting a 404.
router.put('/:taskId', updateProjectTask);

// DELETE /api/project-tasks/:taskId    -> delete a task
//        THIS WAS MISSING TOO.
router.delete('/:taskId', deleteProjectTask);

export default router;