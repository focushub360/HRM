import { Router } from 'express';
import { addProjectTask, getProjectTasks } from '../controllers/taskController.js';

const router = Router();

// POST /api/project-tasks         -> create a project task (was wrongly wired to addProject)
router.post('/', addProjectTask);
// GET  /api/project-tasks/:projectId -> fetch tasks for a project (kept for symmetry with the frontend's /tasks/project/:id)
router.get('/:projectId', getProjectTasks);

export default router;