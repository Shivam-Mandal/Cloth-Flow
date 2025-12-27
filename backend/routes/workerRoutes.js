// routes/workerRoutes.js
import express from "express";
import { getWorker, getActiveWorkersCount } from "../controllers/workerController.js";
import { verifyAccessToken } from "../middlewares/authMiddleware.js"; // optional if you use JWT

const router = express.Router();

// Get all workers or a single worker by ID
router.get("/", verifyAccessToken, getWorker);
router.get("/:id", verifyAccessToken, getWorker);

// Get active workers count
router.get("/active/count", verifyAccessToken, getActiveWorkersCount);

export default router;
