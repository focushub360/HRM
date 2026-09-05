  import { Router } from 'express';
  import { submitDailyWorkReport, getDailyWorkReports, getEmployeeDailyReport } from '../controllers/dailyWorkReportController.js';

  const router = Router();

  router.post('/', submitDailyWorkReport);
  router.get('/', getDailyWorkReports);
  router.get('/employee/:empId', getEmployeeDailyReport);

  export default router;
