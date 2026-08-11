import { Router } from 'express';
import { logVisit, getVisits, deleteVisit } from '../controllers/visitController.js';

const router = Router();

router.route('/').get(getVisits).post(logVisit);
router.get('/:companyId', getVisits);
router.delete('/:id', deleteVisit);

export default router;