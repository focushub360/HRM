import { Router } from 'express';

import companyRoutes from './companyRoutes.js';
import authRoutes from './authRoutes.js';
import activityRoutes from './activityRoutes.js';
import inactivityRoutes from './inactivityRoutes.js';
import proctoringRoutes from './proctoringRoutes.js';
import leadRoutes from './leadRoutes.js';
import visitRoutes from './visitRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import eventRoutes from './eventRoutes.js';
import recognitionRoutes from './recognitionRoutes.js';
import feedRoutes from './feedRoutes.js';
import taskRoutes from './taskRoutes.js';
import projectRoutes from './projectRoutes.js';
import projectTaskRoutes from './projectTaskRoutes.js';
import gpsRoutes from './gpsRoutes.js';
import dailyWorkReportRoutes from './dailyWorkReportRoutes.js';

import { getProjectsWithTasks } from '../controllers/projectController.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'Server is running' }));

router.use('/companies', companyRoutes);
router.use('/auth', authRoutes);
router.use('/activities', activityRoutes);
router.use('/inactivity-alerts', inactivityRoutes);
router.use('/proctoring', proctoringRoutes);
router.use('/leads', leadRoutes);
router.use('/visits', visitRoutes);
router.use('/leaverequests', leaveRoutes);
router.use('/events', eventRoutes);
router.use('/recognitions', recognitionRoutes);
router.use('/feed', feedRoutes);
router.use('/tasks', taskRoutes);
router.use('/projects', projectRoutes);
router.use('/project-tasks', projectTaskRoutes);
router.use('/gps', gpsRoutes);
router.use('/daily-reports', dailyWorkReportRoutes);

// Batch endpoint: projects + their tasks combined
router.get('/projects-with-tasks/:companyId', getProjectsWithTasks);

export default router;