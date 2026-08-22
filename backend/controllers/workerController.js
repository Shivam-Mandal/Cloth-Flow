// controllers/workerController.js
import { WorkerModel } from "../models/Worker.js";
import Assignment from "../models/Assignment.js";
import ApprovalHistory from "../models/ApprovalHistory.js";
import SubOrder from "../models/SubOrderSchema.js";

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

/**
 * @desc Get real-time worker performance metrics and detailed task breakdown for each worker
 * @route GET /api/workers/performance
 * @access Private (admin)
 */
export const getWorkerPerformance = async (req, res) => {
  try {
    // 1. Fetch all workers
    const workers = await WorkerModel.find().select("-password -refreshToken").lean();

    // 2. Fetch all assignments
    const assignments = await Assignment.find()
      .populate({
        path: 'subOrder',
        select: 'name orderId currentStage status pieces totalPieces code subOrderCode approvedPieces completedBy faultyPieces'
      })
      .populate({
        path: 'order',
        select: 'orderId style styleSnapshot'
      })
      .lean();

    // 3. Fetch all suborders
    const subOrders = await SubOrder.find().lean();

    // 4. Fetch all approved history entries
    const history = await ApprovalHistory.find().lean();

    const workerPerformanceList = workers.map(worker => {
      const workerIdStr = String(worker._id);

      // Active assignments currently claimed by this worker
      const activeAssignments = assignments.filter(
        a => a.worker && String(a.worker) === workerIdStr && a.status === 'assigned'
      );

      // Completed assignments
      const completedAssignments = assignments.filter(
        a => a.worker && String(a.worker) === workerIdStr && a.status === 'completed'
      );

      // Worker history: approved entries where actor is worker OR subOrder completedBy is worker
      const workerApprovedHistories = history.filter(h => {
        if (h.action !== 'approved') return false;
        if (h.actor && String(h.actor) === workerIdStr) return true;
        const sub = subOrders.find(s => String(s._id) === String(h.subOrder));
        if (sub && String(sub.completedBy) === workerIdStr) return true;
        return false;
      });

      // Total earnings for approved work
      const totalEarnings = workerApprovedHistories.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

      // Pieces completed calculation
      let piecesCompleted = completedAssignments.reduce((sum, a) => {
        let pcs = Number(a.completedPieces) || 0;
        if (!pcs && a.pieces) {
          if (typeof a.pieces === 'number') pcs = a.pieces;
          else if (typeof a.pieces === 'object') {
            for (const col of Object.keys(a.pieces)) {
              const szs = a.pieces[col];
              if (typeof szs === 'number') pcs += szs;
              else if (typeof szs === 'object') {
                for (const k of Object.keys(szs)) pcs += Number(szs[k]) || 0;
              }
            }
          }
        }
        return sum + pcs;
      }, 0);

      // If history exists but assignment completedPieces is 0, sum subOrder approvedPieces
      if (piecesCompleted === 0 && workerApprovedHistories.length > 0) {
        piecesCompleted = workerApprovedHistories.reduce((sum, h) => {
          const sub = subOrders.find(s => String(s._id) === String(h.subOrder));
          return sum + (Number(sub?.approvedPieces ?? sub?.submittedPieces) || 0);
        }, 0);
      }

      // Damaged pieces calculation
      let damagedPieces = completedAssignments.reduce((sum, a) => sum + (Number(a.damagedPieces) || 0), 0);
      if (damagedPieces === 0) {
        const completedSubs = subOrders.filter(s => String(s.completedBy) === workerIdStr);
        damagedPieces = completedSubs.reduce((sum, s) => sum + (Number(s.faultyPieces) || 0), 0);
      }

      const lastLoginDate = worker.lastLogin ? new Date(worker.lastLogin) : null;
      const isRecentlyActive = lastLoginDate && (Date.now() - lastLoginDate.getTime() < 24 * 3600 * 1000);
      let status = 'offline';
      if (activeAssignments.length > 0 || isRecentlyActive) {
        status = 'active';
      }

      const activeTaskDetails = activeAssignments.map(a => {
        const sub = a.subOrder || {};
        const ord = a.order || {};
        const styleName = ord.style?.name || ord.styleSnapshot?.name || '—';
        let pcsCount = 0;
        if (typeof a.pieces === 'number') pcsCount = a.pieces;
        else if (typeof a.pieces === 'object') {
          for (const col of Object.keys(a.pieces)) {
            const szs = a.pieces[col];
            if (typeof szs === 'number') pcsCount += szs;
            else if (typeof szs === 'object') {
              for (const k of Object.keys(szs)) pcsCount += Number(szs[k]) || 0;
            }
          }
        }
        if (!pcsCount) pcsCount = sub.totalPieces || sub.pieces || 0;

        return {
          id: a._id,
          subOrderCode: sub.subOrderCode || sub.code || (sub._id ? String(sub._id).slice(-6) : '—'),
          orderId: ord.orderId || sub.orderId || '—',
          styleName,
          stage: a.stage || sub.currentStage || worker.workerType || '—',
          pieces: pcsCount,
          assignedAt: a.assignedAt || a.createdAt,
          status: a.status
        };
      });

      return {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone || '—',
        department: worker.workerType || worker.category || 'General',
        piecesCompleted,
        damagedPieces,
        completedTasksCount: completedAssignments.length || workerApprovedHistories.length,
        activeTasksCount: activeAssignments.length,
        activeTaskDetails,
        salary: totalEarnings,
        status,
        permissions: {
          autoApprove: Boolean(worker.autoApprove),
          increasePieces: Boolean(worker.allowExcessPieces ?? worker.increasePieces),
          allowMultipleClaims: Boolean(worker.allowMultipleClaims)
        },
        lastLogin: worker.lastLogin
      };
    });

    const activeWorkersCount = workerPerformanceList.filter(w => w.status === 'active').length;
    const totalPiecesCompleted = workerPerformanceList.reduce((sum, w) => sum + w.piecesCompleted, 0);
    const totalDamagedPieces = workerPerformanceList.reduce((sum, w) => sum + w.damagedPieces, 0);
    const totalPayoutOverall = workerPerformanceList.reduce((sum, w) => sum + w.salary, 0);

    return res.status(200).json({
      success: true,
      summary: {
        activeWorkers: activeWorkersCount,
        totalWorkers: workers.length,
        totalPieces: totalPiecesCompleted,
        totalDamagedPieces,
        totalPayout: totalPayoutOverall
      },
      workers: workerPerformanceList
    });
  } catch (error) {
    console.error("Error fetching worker performance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load worker performance",
      error: error.message
    });
  }
};
