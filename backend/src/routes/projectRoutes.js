import { Router } from 'express';
import { addProject, getProjects, getProjectsWithTasks } from '../controllers/projectController.js';

const router = Router();

router.post('/', addProject);
router.get('/:companyId', getProjects);

export default router;