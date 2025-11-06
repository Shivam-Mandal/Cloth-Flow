// routes/index.js
import express from 'express';
import { getAvailableAssignments, pickAssignment, getAssignmentById, completeAssignment, releaseAssignment, forMeAssignments, getAvailableForMe } from '../controllers/assignmentController.js';
import {  verifyAccessToken } from '../middlewares/authMiddleware.js';

const router = express.Router();



// Assignments
router.get('/available', verifyAccessToken, getAvailableAssignments);
router.get('/available-for-me', verifyAccessToken, getAvailableForMe);

router.patch('/:id/pick', verifyAccessToken, pickAssignment);
router.patch('/:id/complete', verifyAccessToken, completeAssignment);
router.patch('/:id/release', verifyAccessToken, releaseAssignment);
router.get('/for-me', verifyAccessToken, forMeAssignments);
router.get('/:id', verifyAccessToken, getAssignmentById);


export default router;
