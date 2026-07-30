import express from 'express';
import { createStage, deleteStage, getStages, updateStage } from '../controllers/stageController.js';
import { requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verifyAccessToken, getStages);
router.post('/', verifyAccessToken, requireRole(['admin']), createStage);
router.patch('/:id', verifyAccessToken, requireRole(['admin']), updateStage);
router.delete('/:id', verifyAccessToken, requireRole(['admin']), deleteStage);

export default router;
