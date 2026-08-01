// controllers/workerController.js
import { WorkerModel } from "../models/Worker.js";

/**
 * @desc Get all workers or a specific worker by ID
 * @route GET /api/workers
 * @route GET /api/workers/:id
 * @access Private (admin or authenticated)
 */
export const getWorker = async (req, res) => {
  try {
    const { id } = req.params;

    // If worker ID is provided, fetch that particular worker
    if (id) {
      const isAdmin = req.user?.role === 'admin';
      const isSelf = req.user?.role === 'worker' && String(req.user?.id || req.user?._id) === String(id);

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const worker = await WorkerModel.findById(id).select("-password -refreshToken");
      if (!worker) {
        return res.status(404).json({ success: false, message: "Worker not found" });
      }
      return res.status(200).json({ success: true, worker });
    }

    // Otherwise fetch all workers
    const workers = await WorkerModel.find().select("-password -refreshToken");
    res.status(200).json({ success: true, workers });

  } catch (error) {
    console.error("Error fetching worker(s):", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * @desc Get count of active workers (logged in within last 24 hours)
 * @route GET /api/workers/active/count
 * @access Private (admin)
 */
export const getActiveWorkersCount = async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeWorkersCount = await WorkerModel.countDocuments({
      lastLogin: { $gte: last24Hours }
    });

    res.status(200).json({ success: true, activeWorkersCount });
  } catch (error) {
    console.error("Error fetching active workers count:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
