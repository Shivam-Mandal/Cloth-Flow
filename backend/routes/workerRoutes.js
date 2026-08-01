// routes/workerRoutes.js
import express from "express";
import { getWorker, getActiveWorkersCount } from "../controllers/workerController.js";
import { requireRole, verifyAccessToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get all workers or a single worker by ID
router.get("/", verifyAccessToken, requireRole(['admin']), getWorker);

// Get active workers count
router.get("/active/count", verifyAccessToken, requireRole(['admin']), getActiveWorkersCount);

router.get("/:id", verifyAccessToken, getWorker);

export default router;
