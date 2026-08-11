import { Router } from 'express';
import {
  addLeaveRequest,
  getLeaveRequestsByCompany,
  getLeaveRequestsByUser,
  updateLeaveRequestStatus
} from '../controllers/leaveController.js';

const router = Router();

router.post('/', addLeaveRequest);
router.get('/company/:companyId', getLeaveRequestsByCompany);
router.get('/user/:userId', getLeaveRequestsByUser);
router.put('/:id', updateLeaveRequestStatus);

export default router;