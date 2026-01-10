// controllers/approvalController.js
import mongoose from 'mongoose';
import SubOrder from '../models/SubOrderSchema.js';
import Order from '../models/Order.js';
import { createNextStageAssignments } from './orderController.js';
import ApprovalHistory from '../models/ApprovalHistory.js';

console.log('Loaded approvalController from', typeof import.meta !== 'undefined' ? import.meta.url : __filename);

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

    // Add calculated payment info for admin review
    const enrichedApprovals = pendingSubOrders.map(subOrder => {
      let calculatedPayment = 0;
      if (subOrder.order?.style?.steps && subOrder.approvedPieces > 0) {
        const currentStageStep = subOrder.order.style.steps.find(
          step => step.label.toLowerCase() === subOrder.currentStage.toLowerCase()
        );
        if (currentStageStep && currentStageStep.price) {
          calculatedPayment = subOrder.approvedPieces * currentStageStep.price;
        }
      }
      
      return {
        ...subOrder,
        calculatedPayment,
        pricePerPiece: subOrder.order?.style?.steps?.find(
          step => step.label.toLowerCase() === subOrder.currentStage.toLowerCase()
        )?.price || 0
      };
    });

    res.json({ success: true, approvals: enrichedApprovals });
  } catch (error) {
    console.error('getPendingApprovals error:', error);
    res.status(500).json({ error: 'Server error' });
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

      // Auto-calculate payment based on approved pieces and style pricing
      let calculatedPayment = 0;
      if (subOrder.order?.style?.steps && subOrder.approvedPieces > 0) {
        const currentStageStep = subOrder.order.style.steps.find(
          step => step.label.toLowerCase() === subOrder.currentStage.toLowerCase()
        );
        if (currentStageStep && currentStageStep.price) {
          calculatedPayment = subOrder.approvedPieces * currentStageStep.price;
        }
      }

      // Update suborder status
      subOrder.status = 'approved';
      subOrder.approvedBy = adminId;
      subOrder.approvedAt = new Date();
      subOrder.amount = calculatedPayment;
      subOrder.workerEarnings = calculatedPayment;
      await subOrder.save({ session });

      // Add payment to worker account
      if (calculatedPayment > 0 && subOrder.completedBy) {
        await mongoose.model('Worker').findByIdAndUpdate(
          subOrder.completedBy,
          { $inc: { accountBalance: calculatedPayment } },
          { session }
        );
      }

      // Emit real-time update to worker
      const io = req.app.get('io');
      if (io && subOrder.completedBy) {
        io.emit(`worker-${subOrder.completedBy}`, {
          type: 'APPROVAL_APPROVED',
          subOrder: {
            _id: subOrder._id,
            name: subOrder.name,
            currentStage: subOrder.currentStage,
            amount: calculatedPayment,
            status: 'approved'
          }
        });
      }

      // Log approval to history
      await logApprovalHistory(subOrder, 'approved', adminId, 'admin', {
        amount: calculatedPayment,
        previousStatus: 'pending_approval'
      });

      // Create next stage assignments
      const orderId = subOrder.order._id;
      const currentStage = subOrder.currentStage;
      console.log('[approveSubOrder] creating next-stage assignments for stage:', currentStage);

      const created = await createNextStageAssignments(orderId, currentStage, { session });
      console.log('[approveSubOrder] created next-stage assignments count:', (created || []).length);
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

      // Reset suborder status to in_progress so worker can continue
      subOrder.status = 'in_progress';
      subOrder.progress = 0; // Reset progress so assignments can be completed again
      await subOrder.save({ session });

      // Log rejection to history
      await logApprovalHistory(subOrder, 'rejected', adminId, 'admin', {
        reason,
        previousStatus: 'pending_approval'
      });

      // Reset related assignments to available status
      await mongoose.model('Assignment').updateMany(
        { subOrder: subOrderId, status: 'completed' },
        { status: 'available', worker: null, assignedAt: null, completedAt: null, completedBy: null },
        { session }
      );
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
      .populate('order')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, approvals: pendingSubOrders });
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
