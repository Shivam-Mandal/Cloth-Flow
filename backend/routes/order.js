import express from 'express';
import { createOrder, getOrders, getOrder, updateOrder, deleteOrder } from '../controllers/orderController.js';
import { requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyAccessToken, requireRole(['admin']), createOrder);
router.get('/', verifyAccessToken, getOrders);
router.get('/:id', verifyAccessToken, getOrder);
router.put('/:id', verifyAccessToken, requireRole(['admin']), updateOrder);
router.delete('/:id', verifyAccessToken, requireRole(['admin']), deleteOrder);

export default router;
