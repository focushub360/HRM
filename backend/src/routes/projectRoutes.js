import { Router } from 'express';
import { addProject, getProjects, getProjectsWithTasks, updateProject, deleteProject } from '../controllers/projectController.js';

const router = Router();

router.post('/', addProject);
router.get('/:companyId', getProjects);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
