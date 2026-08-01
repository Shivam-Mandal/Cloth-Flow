import express from 'express';
import { createCloudinaryUploadSignature } from '../controllers/uploadController.js';
import { requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/cloudinary/signature', verifyAccessToken, requireRole(['admin']), createCloudinaryUploadSignature);

export default router;
