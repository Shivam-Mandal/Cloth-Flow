// routes/approvalRoutes.js
import express from 'express';
import {
  getPendingApprovals,
  approveSubOrder,
  rejectSubOrder,
  getWorkerCompletedWork,
  getPackingInventory,
  getApprovalHistory,
  getWorkerApprovalHistory,
  getWorkerPendingApprovals
} from '../controllers/approvalController.js';
import { requireInventoryAccess, requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin routes
router.get('/pending', verifyAccessToken, requireRole(['admin']), getPendingApprovals);
router.get('/inventory', verifyAccessToken, requireInventoryAccess, getPackingInventory);
router.post('/:subOrderId/approve', verifyAccessToken, requireRole(['admin']), approveSubOrder);
router.post('/:subOrderId/reject', verifyAccessToken, requireRole(['admin']), rejectSubOrder);
router.get('/history', verifyAccessToken, requireRole(['admin']), getApprovalHistory);

// Worker routes
router.get('/worker/pending', verifyAccessToken, requireRole(['worker']), getWorkerPendingApprovals);
router.get('/worker/completed-work', verifyAccessToken, requireRole(['worker']), getWorkerCompletedWork);
router.get('/worker/history', verifyAccessToken, requireRole(['worker']), getWorkerApprovalHistory);

export default router;
