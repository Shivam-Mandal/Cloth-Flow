import express from 'express';
import { createUser, getUsers } from '../controllers/userController.js';
import { requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verifyAccessToken, requireRole(['admin']), getUsers);
router.post('/', verifyAccessToken, requireRole(['admin']), createUser);

export default router;
