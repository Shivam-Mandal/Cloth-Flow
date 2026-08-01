// routes/subOrderRoutes.js
import express from 'express';
import { submitSubOrder, getMySubOrders, updateInventoryRecord } from '../controllers/subOrderController.js';
import { requireInventoryAccess, requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Worker routes
router.get('/my-work', verifyAccessToken, requireRole(['worker']), getMySubOrders);
router.post('/:id/submit', verifyAccessToken, requireRole(['worker']), submitSubOrder);
router.patch('/:id/inventory', verifyAccessToken, requireInventoryAccess, updateInventoryRecord);

export default router;
