// routes/authRoutes.js  (add this route)
import express from 'express';
import * as auth from '../controllers/authController.js';
import { verifyAccessToken } from '../middlewares/authMiddleware.js';
import { issueCsrfToken } from '../middlewares/csrfMiddleware.js';
import { rateLimit } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.get('/csrf-token', issueCsrfToken);
router.post('/signup', authRateLimit, auth.signup);
router.post('/login', authRateLimit, auth.login);
router.post('/logout', auth.logout);
router.post('/refresh-token', authRateLimit, auth.refreshTokenHandler);
router.get('/me', verifyAccessToken, auth.me);
router.patch('/profile', verifyAccessToken, auth.updateProfile);
router.patch('/password', authRateLimit, verifyAccessToken, auth.changePassword);

export { router as authRouter };
