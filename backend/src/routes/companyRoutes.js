import { Router } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyCredentials,
  updateCompanySettings,
  getFeatureSettings,
  updateFeatureSettings,
  updateCompanyAdmin
} from '../controllers/companyController.js';
import { getEmployeesByCompany, addEmployeeToCompany, removeEmployeeFromCompany, updateEmployeeInCompany } from '../controllers/employeeController.js';
import { addHRToCompany, removeHRFromCompany, updateHRStatus, updateHRInCompany } from '../controllers/hrController.js';
import { getActivityLogsByCompany } from '../controllers/activityController.js';
import { getInactivityAlerts } from '../controllers/inactivityController.js';
import { getProctoringDataByCompany } from '../controllers/proctoringController.js';

const router = Router();

router.route('/').get(getCompanies).post(createCompany);
router.route('/:id').get(getCompanyById).put(updateCompany).delete(deleteCompany);
router.put('/:id/settings', updateCompanySettings);
// Admin Settings -> Application Settings (per-company feature toggles)
router.route('/:id/feature-settings').get(getFeatureSettings).put(updateFeatureSettings);
router.put('/:companyId/admin', updateCompanyAdmin);
router.get('/:companyId/credentials', getCompanyCredentials);

// Nested: HR
router.post('/:companyId/hr', addHRToCompany);
router.put('/:companyId/hr/:hrId', updateHRInCompany);
router.put('/:companyId/hr/:hrId/status', updateHRStatus);
router.delete('/:companyId/hr/:hrId', removeHRFromCompany);

// Nested: Employees
router.route('/:companyId/employees').get(getEmployeesByCompany).post(addEmployeeToCompany);
router.route('/:companyId/employees/:employeeId').put(updateEmployeeInCompany).delete(removeEmployeeFromCompany);

// Nested: Activities / Alerts / Proctoring
router.get('/:companyId/activities', getActivityLogsByCompany);
router.get('/:companyId/inactivity-alerts', getInactivityAlerts);
router.get('/:companyId/proctoring', getProctoringDataByCompany);

export default router;