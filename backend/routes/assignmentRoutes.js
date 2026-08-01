// routes/index.js
import express from 'express';
import { getAvailableAssignments, pickAssignment, getAssignmentById, completeAssignment, releaseAssignment, forMeAssignments, getAvailableForMe } from '../controllers/assignmentController.js';
import { requireRole, verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();



// Assignments
router.get('/available', verifyAccessToken, requireRole(['admin']), getAvailableAssignments);
router.get('/available-for-me', verifyAccessToken, requireRole(['worker']), getAvailableForMe);

router.patch('/:id/pick', verifyAccessToken, requireRole(['worker']), pickAssignment);
router.patch('/:id/complete', verifyAccessToken, requireRole(['worker', 'admin']), completeAssignment);
router.patch('/:id/release', verifyAccessToken, requireRole(['worker', 'admin']), releaseAssignment);
router.get('/for-me', verifyAccessToken, requireRole(['worker']), forMeAssignments);
router.get('/:id', verifyAccessToken, getAssignmentById);


export default router;
