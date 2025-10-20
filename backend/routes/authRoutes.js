// routes/authRoutes.js  (add this route)
import express from 'express';
import * as auth from '../controllers/authController.js';
import { verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', auth.signup);
router.post('/login', auth.login);  
router.post('/logout', auth.logout);
router.post('/refresh-token', auth.refreshTokenHandler);
router.get('/me', verifyAccessToken, auth.me);

export { router as authRouter };
