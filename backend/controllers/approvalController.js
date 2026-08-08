import mongoose from 'mongoose';
import SubOrder from '../models/SubOrderSchema.js';
import Order from '../models/Order.js';
import { Style } from '../models/StyleSchema.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import { approveWorkflowStage, calculateStageEarningsFromAssignments, rejectWorkflowStage } from '../services/workflowService.js';

const INVENTORY_STATUSES = ['packed', 'ready_for_sale', 'reserved', 'dispatched', 'sold'];

/**
 * Robust helper to resolve style name and size breakdown across subOrder & order schemas
 */
const resolveStyleAndSizes = (subOrder) => {
  const orderDoc = subOrder.order && typeof subOrder.order === 'object' ? subOrder.order : null;

  // 1. Resolve Style Name
  const styleName = orderDoc?.style?.name
    || orderDoc?.styleSnapshot?.name
    || orderDoc?.styleName
    || subOrder.styleName
    || '—';

  // 2. Resolve Sizes
  const sizesSet = new Set();

  const parsePiecesObj = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'number' && val > 0) {
        sizesSet.add(key);
      } else if (typeof val === 'object' && val !== null) {
        parsePiecesObj(val);
      }
    }
  };

  // Try subOrder.pieces
  parsePiecesObj(subOrder.pieces);

  // Try orderDoc.pieces if empty
  if (sizesSet.size === 0 && orderDoc?.pieces) {
    parsePiecesObj(orderDoc.pieces);
  }

  // Try styleSnapshot.sizes or style.sizes
  if (sizesSet.size === 0) {
    const arr = orderDoc?.styleSnapshot?.sizes || orderDoc?.style?.sizes;
    if (Array.isArray(arr) && arr.length > 0) {
      arr.forEach(s => sizesSet.add(s));
    }
  }

  // Fallback: parse from subOrder.name (e.g. "Cutting-Red-S")
  if (sizesSet.size === 0 && typeof subOrder.name === 'string') {
    const parts = subOrder.name.split('-');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && !/batch|suborder/i.test(lastPart)) {
        sizesSet.add(lastPart);
      }
    }
  }

  const sizeStr = sizesSet.size > 0 ? Array.from(sizesSet).join(', ') : '—';

  return { styleName, sizeStr };
};

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

    // Add calculated payment info and resolved style/sizes for admin review
    const enrichedApprovals = await Promise.all(pendingSubOrders.map(async (subOrder) => {
      const {
        amount: calculatedPayment,
        pricePerPiece,
        completedPieces,
        damagedPieces,
        submittedPieces
      } = await calculateStageEarningsFromAssignments(subOrder);

      const { styleName, sizeStr } = resolveStyleAndSizes(subOrder);

      return {
        ...subOrder,
        styleName,
        size: sizeStr,
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
        const totalCompletedPieces = completedPieces || Number(subOrder.approvedPieces) || 0;
        const totalDamagedPieces = damagedPieces || Number(subOrder.faultyPieces) || 0;
        const totalReportedPieces = submittedPieces || Number(subOrder.submittedPieces) || (totalCompletedPieces + totalDamagedPieces);
        const totalSubmittedPieces = totalCompletedPieces > 0
          ? totalCompletedPieces
          : Math.max(0, totalReportedPieces - totalDamagedPieces);
        const availablePieces = ['packed', 'ready_for_sale'].includes(subOrder.inventoryStatus)
          ? totalSubmittedPieces
          : (subOrder.inventoryStatus === 'reserved' ? totalSubmittedPieces : 0);
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
          submittedPieces: totalSubmittedPieces,
          totalPlannedPieces,
          totalSubmittedPieces,
          totalCompletedPieces,
          totalDamagedPieces,
          damageRate:
            totalReportedPieces > 0
              ? Number(((totalDamagedPieces / totalReportedPieces) * 100).toFixed(1))
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

    const workerSubOrders = await getWorkerSubOrders(workerId);
    const filterQuery = {
      $or: [
        { actor: workerId, actorRole: 'worker' },
        { subOrder: { $in: workerSubOrders } }
      ]
    };

    const history = await ApprovalHistory.find(filterQuery)
      .populate('subOrder', 'name orderId currentStage status')
      .populate('order', 'orderId')
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ApprovalHistory.countDocuments(filterQuery);

    const statsAggregation = await ApprovalHistory.aggregate([
      { $match: filterQuery },
      {
        $group: {
          _id: null,
          totalSubmissions: {
            $sum: { $cond: [{ $eq: ['$action', 'submitted'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$action', 'approved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$action', 'rejected'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$action', 'approved'] }, '$amount', 0] }
          }
        }
      }
    ]);

    const stats = statsAggregation[0] ? {
      totalSubmissions: statsAggregation[0].totalSubmissions || 0,
      approvedCount: statsAggregation[0].approvedCount || 0,
      rejectedCount: statsAggregation[0].rejectedCount || 0,
      totalEarnings: statsAggregation[0].totalEarnings || 0
    } : {
      totalSubmissions: 0,
      approvedCount: 0,
      rejectedCount: 0,
      totalEarnings: 0
    };

    res.json({
      success: true,
      history,
      stats,
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

/**
 * POST /api/approvals/summary
 * Calculate summary metrics on the backend for selected subOrder IDs
 */
export const getBulkApprovalSummary = async (req, res) => {
  try {
    const { subOrderIds } = req.body;

    if (!Array.isArray(subOrderIds) || subOrderIds.length === 0) {
      return res.status(400).json({ error: 'subOrderIds must be a non-empty array' });
    }

    const validIds = subOrderIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid subOrderIds provided' });
    }

    const pendingSubOrders = await SubOrder.find({
      _id: { $in: validIds },
      status: 'pending_approval'
    })
      .populate({
        path: 'order',
        populate: { path: 'style' }
      })
      .populate('completedBy', 'name email workerType')
      .lean();

    let totalSubmittedPieces = 0;
    let totalApprovedPieces = 0;
    let totalFaultyPieces = 0;
    let totalCalculatedPayment = 0;
    const stageBreakdownMap = {};
    const workerBreakdownMap = {};

    const itemsSummary = await Promise.all(pendingSubOrders.map(async (subOrder) => {
      const {
        amount: calculatedPayment,
        pricePerPiece,
        completedPieces,
        damagedPieces,
        submittedPieces
      } = await calculateStageEarningsFromAssignments(subOrder);

      totalSubmittedPieces += submittedPieces;
      totalApprovedPieces += completedPieces;
      totalFaultyPieces += damagedPieces;
      totalCalculatedPayment += calculatedPayment;

      const stage = subOrder.currentStage || 'Unknown';
      stageBreakdownMap[stage] = (stageBreakdownMap[stage] || 0) + 1;

      const workerIdStr = subOrder.completedBy?._id?.toString() || 'unknown';
      const workerName = subOrder.completedBy?.name || 'Unknown Worker';
      if (!workerBreakdownMap[workerIdStr]) {
        workerBreakdownMap[workerIdStr] = {
          name: workerName,
          count: 0,
          totalPieces: 0,
          totalPayment: 0
        };
      }
      workerBreakdownMap[workerIdStr].count += 1;
      workerBreakdownMap[workerIdStr].totalPieces += completedPieces;
      workerBreakdownMap[workerIdStr].totalPayment += calculatedPayment;

      const { styleName, sizeStr } = resolveStyleAndSizes(subOrder);

      return {
        _id: subOrder._id,
        name: subOrder.name,
        orderId: subOrder.orderId,
        subOrderCode: subOrder.subOrderCode,
        stage: subOrder.currentStage,
        styleName,
        size: sizeStr,
        workerName,
        submittedPieces,
        approvedPieces: completedPieces,
        faultyPieces: damagedPieces,
        pricePerPiece,
        calculatedPayment
      };
    }));

    const missingOrInvalidCount = validIds.length - pendingSubOrders.length;

    res.json({
      success: true,
      summary: {
        totalRequested: validIds.length,
        totalSelected: pendingSubOrders.length,
        missingOrInvalidCount,
        totalSubmittedPieces,
        totalApprovedPieces,
        totalFaultyPieces,
        totalCalculatedPayment,
        overallDamageRate: (totalSubmittedPieces > 0)
          ? Number(((totalFaultyPieces / totalSubmittedPieces) * 100).toFixed(1))
          : 0,
        stageBreakdown: stageBreakdownMap,
        workerBreakdown: Object.values(workerBreakdownMap),
        items: itemsSummary
      }
    });
  } catch (error) {
    console.error('getBulkApprovalSummary error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

/**
 * POST /api/approvals/bulk-approve
 * Approve multiple pending suborders atomically
 */
export const bulkApproveSubOrders = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { subOrderIds } = req.body;
    const adminId = req.user?._id;

    if (!Array.isArray(subOrderIds) || subOrderIds.length === 0) {
      return res.status(400).json({ error: 'subOrderIds must be a non-empty array' });
    }

    const validIds = subOrderIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid subOrderIds provided' });
    }

    const results = {
      approvedCount: 0,
      failedCount: 0,
      details: []
    };

    await session.withTransaction(async () => {
      for (const id of validIds) {
        try {
          const subOrder = await SubOrder.findById(id)
            .populate({
              path: 'order',
              populate: { path: 'style' }
            })
            .session(session);

          if (!subOrder) {
            results.failedCount++;
            results.details.push({ id, status: 'failed', reason: 'SubOrder not found' });
            continue;
          }

          if (subOrder.status !== 'pending_approval') {
            results.failedCount++;
            results.details.push({ id, status: 'failed', reason: `Status is '${subOrder.status}', not pending_approval` });
            continue;
          }

          const { amount: calculatedPayment } = await approveWorkflowStage(subOrder, {
            adminId,
            session,
            io: req.app.get('io')
          });

          await logApprovalHistory(subOrder, 'approved', adminId, 'admin', {
            amount: calculatedPayment,
            previousStatus: 'pending_approval',
            notes: 'Bulk approved by admin'
          });

          results.approvedCount++;
          results.details.push({ id, status: 'approved', amount: calculatedPayment });
        } catch (err) {
          results.failedCount++;
          results.details.push({ id, status: 'failed', reason: err.message });
        }
      }
    });

    res.json({
      success: true,
      message: `Successfully processed bulk approval. Approved: ${results.approvedCount}, Failed: ${results.failedCount}`,
      ...results
    });
  } catch (error) {
    console.error('bulkApproveSubOrders error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/approvals/bulk-reject
 * Reject multiple pending suborders
 */
export const bulkRejectSubOrders = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { subOrderIds, reason = '' } = req.body;
    const adminId = req.user?._id;

    if (!Array.isArray(subOrderIds) || subOrderIds.length === 0) {
      return res.status(400).json({ error: 'subOrderIds must be a non-empty array' });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const validIds = subOrderIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid subOrderIds provided' });
    }

    const results = {
      rejectedCount: 0,
      failedCount: 0,
      details: []
    };

    await session.withTransaction(async () => {
      for (const id of validIds) {
        try {
          const subOrder = await SubOrder.findById(id).session(session);

          if (!subOrder) {
            results.failedCount++;
            results.details.push({ id, status: 'failed', reason: 'SubOrder not found' });
            continue;
          }

          if (subOrder.status !== 'pending_approval') {
            results.failedCount++;
            results.details.push({ id, status: 'failed', reason: `Status is '${subOrder.status}', not pending_approval` });
            continue;
          }

          await rejectWorkflowStage(subOrder, { session });

          await logApprovalHistory(subOrder, 'rejected', adminId, 'admin', {
            reason: String(reason).trim(),
            previousStatus: 'pending_approval',
            notes: 'Bulk rejected by admin'
          });

          results.rejectedCount++;
          results.details.push({ id, status: 'rejected' });
        } catch (err) {
          results.failedCount++;
          results.details.push({ id, status: 'failed', reason: err.message });
        }
      }
    });

    res.json({
      success: true,
      message: `Successfully processed bulk rejection. Rejected: ${results.rejectedCount}, Failed: ${results.failedCount}`,
      ...results
    });
  } catch (error) {
    console.error('bulkRejectSubOrders error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    session.endSession();
  }
};

