import express from 'express';
import { createUser, getUsers, updateUser } from '../controllers/userController.js';
import { requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verifyAccessToken, requireRole(['admin']), getUsers);
router.post('/', verifyAccessToken, requireRole(['admin']), createUser);
router.patch('/:id', verifyAccessToken, requireRole(['admin']), updateUser);

export default router;
