import { Router } from 'express';
import { addProject, getProjects, getProjectsWithTasks, updateProject } from '../controllers/projectController.js';

const router = Router();

router.post('/', addProject);
router.get('/:companyId', getProjects);
router.put('/:id', updateProject);

export default router;