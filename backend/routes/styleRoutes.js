// routes/styles.js
import express from 'express';
import { getStyles, createStyle, deleteStyle } from '../controllers/styleController.js';
import {requireRole, verifyAccessToken} from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get('/', verifyAccessToken, getStyles);
router.post('/', verifyAccessToken, requireRole(['admin']), createStyle); // expects JSON body
router.delete('/:id', verifyAccessToken, requireRole(['admin']), deleteStyle);

export { router as styleRouter };
