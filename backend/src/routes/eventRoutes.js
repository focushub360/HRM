import { Router } from 'express';
import { getEventsByCompany, addEvent } from '../controllers/eventController.js';

const router = Router();

router.route('/').get(getEventsByCompany).post(addEvent);

export default router;