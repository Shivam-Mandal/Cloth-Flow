// routes/subOrderRoutes.js
import express from 'express';
import { submitSubOrder, getMySubOrders, updateInventoryRecord } from '../controllers/subOrderController.js';
import { verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Worker routes
router.get('/my-work', verifyAccessToken, getMySubOrders);
router.post('/:id/submit', verifyAccessToken, submitSubOrder);
router.patch('/:id/inventory', verifyAccessToken, updateInventoryRecord);

export default router;
