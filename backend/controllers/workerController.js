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
      const worker = await WorkerModel.findById(id).select("-password");
      if (!worker) {
        return res.status(404).json({ success: false, message: "Worker not found" });
      }
      return res.status(200).json({ success: true, worker });
    }

    // Otherwise fetch all workers
    const workers = await WorkerModel.find().select("-password");
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
