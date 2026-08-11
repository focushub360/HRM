import { Router } from 'express';
import { getLeads, addLead, updateLead } from '../controllers/leadController.js';

const router = Router();

router.route('/').get(getLeads).post(addLead);
router.get('/:companyId', getLeads);
router.put('/:id', updateLead);

export default router;