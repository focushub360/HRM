import { Router } from 'express';
import { addRecognition, getRecognitionsByCompany } from '../controllers/recognitionController.js';

const router = Router();

router.post('/', addRecognition);
router.get('/:companyId', getRecognitionsByCompany);

export default router;