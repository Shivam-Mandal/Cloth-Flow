// controllers/approvalController.js
import mongoose from 'mongoose';
import SubOrder from '../models/SubOrderSchema.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import { approveWorkflowStage, calculateStageEarningsFromAssignments, rejectWorkflowStage } from '../services/workflowService.js';

const INVENTORY_STATUSES = ['packed', 'ready_for_sale', 'reserved', 'dispatched', 'sold'];

const generateSubOrderCode = () => {
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SO-${time}${rand}`;
};

const computePiecesTotal = (pieces = {}) => {
  let total = 0;

  if (!pieces || typeof pieces !== 'object') return total;

  for (const color of Object.keys(pieces)) {
    const sizes = pieces[color];
    if (typeof sizes === 'number') {
      total += Number(sizes) || 0;
      continue;
    }

    if (!sizes || typeof sizes !== 'object') continue;

    for (const size of Object.keys(sizes)) {
      total += Number(sizes[size]) || 0;
    }
  }

  return total;
};

/**
 * Helper function to log approval history
 */
const logApprovalHistory = async (subOrder, action, actor, actorRole, options = {}) => {
  try {
    const historyEntry = new ApprovalHistory({
      subOrder: subOrder._id,
      order: subOrder.order,
      action,
      actor,
      actorRole,
      amount: options.amount || 0,
      reason: options.reason || '',
      previousStatus: options.previousStatus || '',
      newStatus: subOrder.status,
      notes: options.notes || '',
      metadata: {
        subOrderName: subOrder.name,
        orderId: subOrder.orderId,
        stage: subOrder.currentStage,
        progress: subOrder.progress
      }
    });
    await historyEntry.save();
  } catch (error) {
    console.error('Failed to log approval history:', error);
    // Don't throw - we don't want history logging to break the main flow
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    const pendingSubOrders = await SubOrder.find({ status: 'pending_approval' })
      .populate({
        path: 'order',
        populate: {
          path: 'style'
        }
      })
      .populate('completedBy', 'name email workerType')
      .sort({ updatedAt: -1 })
      .lean();

    // Backfill subOrderCode if missing (existing records)
    await Promise.all(pendingSubOrders.map(async (so) => {
      if (!so.subOrderCode) {
        const code = generateSubOrderCode();
        try {
          await SubOrder.updateOne(
            { _id: so._id, subOrderCode: { $exists: false } },
            { $set: { subOrderCode: code } }
          ).exec();
          so.subOrderCode = code;
        } catch (e) {
          // best-effort: still return a generated code in response
          so.subOrderCode = code;
        }
      }
    }));

    // Add calculated payment info for admin review
    const enrichedApprovals = await Promise.all(pendingSubOrders.map(async (subOrder) => {
      const {
        amount: calculatedPayment,
        pricePerPiece,
        completedPieces,
        damagedPieces,
        submittedPieces
      } = await calculateStageEarningsFromAssignments(subOrder);

      return {
        ...subOrder,
        submittedPieces,
        approvedPieces: completedPieces,
        faultyPieces: damagedPieces,
        calculatedPayment,
        pricePerPiece
      };
    }));

    res.json({ success: true, approvals: enrichedApprovals });
  } catch (error) {
    console.error('getPendingApprovals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPackingInventory = async (req, res) => {
  try {
    const { q = '', status = '', styleId = '', startDate = '', endDate = '' } = req.query;

    const inventoryQuery = {
      inventoryStatus: { $in: INVENTORY_STATUSES }
    };

    const packedSubOrders = await SubOrder.find(inventoryQuery)
      .populate({
        path: 'order',
        populate: {
          path: 'style'
        }
      })
      .populate('completedBy', 'name email workerType')
      .populate('approvedBy', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const searchNeedle = String(q).trim().toLowerCase();

    const enrichedInventory = await Promise.all(
      packedSubOrders.map(async (subOrder) => {
        const totalPlannedPieces = computePiecesTotal(subOrder.pieces);
        const {
          completedPieces,
          damagedPieces,
          submittedPieces
        } = await calculateStageEarningsFromAssignments(subOrder);
        const totalPackedPieces =
          submittedPieces ||
          (Number(subOrder.submittedPieces) || 0) ||
          totalPlannedPieces;
        const totalCompletedPieces = completedPieces || Number(subOrder.approvedPieces) || 0;
        const totalDamagedPieces = damagedPieces || Number(subOrder.faultyPieces) || 0;
        const availablePieces = ['packed', 'ready_for_sale'].includes(subOrder.inventoryStatus)
          ? (totalCompletedPieces || Math.max(0, totalPackedPieces - totalDamagedPieces))
          : (subOrder.inventoryStatus === 'reserved' ? (totalCompletedPieces || Math.max(0, totalPackedPieces - totalDamagedPieces)) : 0);
        const photos = Array.isArray(subOrder.order?.style?.photos) && subOrder.order.style.photos.length > 0
          ? subOrder.order.style.photos
          : (Array.isArray(subOrder.order?.style?.images) && subOrder.order.style.images.length > 0)
            ? subOrder.order.style.images
            : (subOrder.order?.style?.photo ? [subOrder.order.style.photo] : (subOrder.order?.style?.image ? [subOrder.order.style.image] : []));
        const image =
          photos[0] ||
          subOrder.order?.style?.photo ||
          subOrder.order?.style?.image ||
          subOrder.order?.style?.imageUrl ||
          null;

        return {
          ...subOrder,
          totalPlannedPieces,
          totalPackedPieces,
          totalCompletedPieces,
          totalDamagedPieces,
          damageRate:
            totalPackedPieces > 0
              ? Number(((totalDamagedPieces / totalPackedPieces) * 100).toFixed(1))
              : 0,
          availablePieces,
          image,
          photos
        };
      })
    );

    // Extract unique styles for filter dropdown
    const styleMap = new Map();
    enrichedInventory.forEach((item) => {
      const styleObj = item.order?.style;
      if (styleObj && styleObj._id) {
        const sid = styleObj._id.toString();
        if (!styleMap.has(sid)) {
          styleMap.set(sid, { _id: sid, name: styleObj.name || styleObj.styleId || 'Unnamed Style' });
        }
      } else if (item.name) {
        if (!styleMap.has(item.name)) {
          styleMap.set(item.name, { _id: item.name, name: item.name });
        }
      }
    });
    const styles = Array.from(styleMap.values());

    const inventory = enrichedInventory
      .filter((item) => (status && status !== 'all' ? item.inventoryStatus === status : true))
      .filter((item) => {
        if (!styleId || styleId === 'all') return true;
        const sId = item.order?.style?._id?.toString() || item.order?.style?.toString() || item.name || '';
        return sId === styleId;
      })
      .filter((item) => {
        if (!startDate) return true;
        const itemDate = new Date(item.inventoryUpdatedAt || item.updatedAt || item.createdAt);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        return itemDate >= start;
      })
      .filter((item) => {
        if (!endDate) return true;
        const itemDate = new Date(item.inventoryUpdatedAt || item.updatedAt || item.createdAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate <= end;
      })
      .filter((item) => {
        if (!searchNeedle) return true;

        const haystack = [
          item.order?.orderId,
          item.orderId,
          item.subOrderCode,
          item.name,
          item.order?.style?.name,
          item.completedBy?.name,
          item.status,
          item.inventoryStatus,
          item.inventoryLocation,
          item.saleReference
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchNeedle);
      });

    return res.json({ success: true, inventory, styles });
  } catch (error) {
    console.error('getPackingInventory error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

/**
 * POST /api/approvals/:subOrderId/approve
 * Approve a suborder and create next stage assignments
 */
export const approveSubOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { subOrderId } = req.params;
    const adminId = req.user?._id;
    // Admin only confirms approval - no amount input

    if (!mongoose.Types.ObjectId.isValid(subOrderId)) {
      return res.status(400).json({ error: 'Invalid subOrderId' });
    }

    await session.withTransaction(async () => {
      // Find and update the suborder
      const subOrder = await SubOrder.findById(subOrderId)
        .populate({
          path: 'order',
          populate: {
            path: 'style'
          }
        })
        .session(session);
        
      if (!subOrder) {
        throw new Error('SubOrder not found');
      }

      if (subOrder.status !== 'pending_approval') {
        throw new Error('SubOrder is not pending approval');
      }

      const { amount: calculatedPayment } = await approveWorkflowStage(subOrder, {
        adminId,
        session,
        io: req.app.get('io')
      });

      // Log approval to history
      await logApprovalHistory(subOrder, 'approved', adminId, 'admin', {
        amount: calculatedPayment,
        previousStatus: 'pending_approval'
      });
    });

    res.json({ success: true, message: 'SubOrder approved and payment calculated automatically' });
  } catch (error) {
    console.error('approveSubOrder error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/approvals/:subOrderId/reject
 * Reject a suborder (send back to worker for correction)
 */
export const rejectSubOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { subOrderId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(subOrderId)) {
      return res.status(400).json({ error: 'Invalid subOrderId' });
    }

    await session.withTransaction(async () => {
      const subOrder = await SubOrder.findById(subOrderId).session(session);
      if (!subOrder) {
        throw new Error('SubOrder not found');
      }

      if (subOrder.status !== 'pending_approval') {
        throw new Error('SubOrder is not pending approval');
      }

      await rejectWorkflowStage(subOrder, { session });

      // Log rejection to history
      await logApprovalHistory(subOrder, 'rejected', adminId, 'admin', {
        reason,
        previousStatus: 'pending_approval'
      });

    });

    res.json({ success: true, message: 'SubOrder rejected and sent back to worker' });
  } catch (error) {
    console.error('rejectSubOrder error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    session.endSession();
  }
};

/**
 * GET /api/approvals/history
 * Get all approval history (admin view)
 */
export const getApprovalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, subOrder, actor } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (action) query.action = action;
    if (subOrder) query.subOrder = subOrder;
    if (actor) query.actor = actor;

    const history = await ApprovalHistory.find(query)
      .populate('subOrder', 'name orderId currentStage')
      .populate('order', 'orderId')
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ApprovalHistory.countDocuments(query);

    res.json({
      success: true,
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('getApprovalHistory error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

/**
 * GET /api/approvals/worker/history
 * Get approval history for current worker
 */
export const getWorkerApprovalHistory = async (req, res) => {
  try {
    const workerId = req.user?._id;
    if (!workerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const history = await ApprovalHistory.find({
      $or: [
        { actor: workerId, actorRole: 'worker' }, // Submissions by this worker
        { subOrder: { $in: await getWorkerSubOrders(workerId) } } // Actions on this worker's suborders
      ]
    })
      .populate('subOrder', 'name orderId currentStage status')
      .populate('order', 'orderId')
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ApprovalHistory.countDocuments({
      $or: [
        { actor: workerId, actorRole: 'worker' },
        { subOrder: { $in: await getWorkerSubOrders(workerId) } }
      ]
    });

    res.json({
      success: true,
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('getWorkerApprovalHistory error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

/**
 * Helper function to get suborders completed by a worker
 */
const getWorkerSubOrders = async (workerId) => {
  const subOrders = await SubOrder.find({ completedBy: workerId }).select('_id');
  return subOrders.map(so => so._id);
};

/**
 * Get pending approvals for a worker (their submitted work awaiting admin approval)
 */
export const getWorkerPendingApprovals = async (req, res) => {
  try {
    const workerId = req.user?._id;

    if (!workerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pendingSubOrders = await SubOrder.find({
      completedBy: workerId,
      status: 'pending_approval'
    })
      .populate({
        path: 'order',
        populate: {
          path: 'style'
        }
      })
      .sort({ updatedAt: -1 })
      .lean();

    const approvals = await Promise.all(pendingSubOrders.map(async (subOrder) => {
      const {
        amount: calculatedPayment,
        pricePerPiece,
        completedPieces,
        damagedPieces,
        submittedPieces
      } = await calculateStageEarningsFromAssignments(subOrder);

      return {
        ...subOrder,
        submittedPieces,
        approvedPieces: completedPieces,
        faultyPieces: damagedPieces,
        calculatedPayment,
        pricePerPiece
      };
    }));

    res.json({ success: true, approvals });
  } catch (error) {
    console.error('getWorkerPendingApprovals error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

/**
 * Get completed work for a worker (approved suborders)
 */
export const getWorkerCompletedWork = async (req, res) => {
  try {
    const workerId = req.user?._id;

    if (!workerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const completedSubOrders = await SubOrder.find({
      completedBy: workerId,
      status: 'approved'
    })
      .populate('order')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, completedWork: completedSubOrders });
  } catch (error) {
    console.error('getWorkerCompletedWork error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
