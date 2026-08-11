import { Router } from 'express';
import { addRoutePoint, getDailyRoute, getDailyStats } from '../controllers/gpsController.js';

const router = Router();

router.post('/route', addRoutePoint);
router.get('/route/:userId', getDailyRoute);
router.get('/stats/:userId', getDailyStats);

export default router;