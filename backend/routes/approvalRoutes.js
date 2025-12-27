// routes/approvalRoutes.js
import express from 'express';
import {
  getPendingApprovals,
  approveSubOrder,
  rejectSubOrder,
  getWorkerCompletedWork,
  getApprovalHistory,
  getWorkerApprovalHistory,
  getWorkerPendingApprovals
} from '../controllers/approvalController.js';
import { verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin routes
router.get('/pending', verifyAccessToken, getPendingApprovals);
router.post('/:subOrderId/approve', verifyAccessToken, approveSubOrder);
router.post('/:subOrderId/reject', verifyAccessToken, rejectSubOrder);
router.get('/history', verifyAccessToken, getApprovalHistory);

// Worker routes
router.get('/worker/pending', verifyAccessToken, getWorkerPendingApprovals);
router.get('/worker/completed-work', verifyAccessToken, getWorkerCompletedWork);
router.get('/worker/history', verifyAccessToken, getWorkerApprovalHistory);

export default router;