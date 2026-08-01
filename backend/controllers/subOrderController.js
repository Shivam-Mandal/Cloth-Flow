// controllers/subOrderController.js
import mongoose from 'mongoose';
import SubOrder from '../models/SubOrderSchema.js';
import Assignment from '../models/Assignment.js';
import { INVENTORY_WORKER_TYPE, isInventoryWorkerType } from '../utils/workflow.js';

const INVENTORY_STATUSES = ['packed', 'ready_for_sale', 'reserved', 'dispatched', 'sold'];

const canManageInventory = (user = {}) => {
  if (user?.role === 'admin') return true;
  return user?.role === 'worker' && isInventoryWorkerType(user?.workerType);
};

/**
 * POST /api/suborders/:id/submit
 * Submit a suborder for admin approval (no immediate payment)
 */
export const submitSubOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const completedPieces = Number(req.body.completedPieces ?? 0);
    const damagedPieces = Number(req.body.damagedPieces ?? 0);
    const workerId = req.user?._id;

    if (!workerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid suborder ID' });
    }

    if (!Number.isFinite(completedPieces) || !Number.isFinite(damagedPieces) || completedPieces < 0 || damagedPieces < 0) {
      return res.status(400).json({ error: 'Completed and damaged pieces must be non-negative numbers' });
    }

    await session.withTransaction(async () => {
      const subOrder = await SubOrder.findById(id).session(session);

      if (!subOrder) {
        throw new Error('SubOrder not found');
      }

      if (subOrder.status !== 'in_progress') {
        throw new Error('SubOrder must be in progress to submit');
      }

      const ownedAssignment = await Assignment.findOne({
        subOrder: id,
        worker: workerId,
        status: { $in: ['assigned', 'in_progress'] }
      }).session(session);

      if (!ownedAssignment) {
        const err = new Error('No active assignment found for this worker and suborder');
        err.status = 403;
        throw err;
      }

      const totalPieces = completedPieces + damagedPieces;
      if (totalPieces !== ownedAssignment.totalPieces) {
        const err = new Error('Submitted pieces must equal assigned pieces');
        err.status = 400;
        throw err;
      }

      // Update suborder with submission details for admin approval
      subOrder.submittedPieces = totalPieces;
      subOrder.approvedPieces = completedPieces; // Initial value, admin can adjust
      subOrder.faultyPieces = damagedPieces;
      subOrder.status = 'pending_approval';
      subOrder.completedBy = workerId;
      subOrder.progress = 100;
      await subOrder.save({ session });

      // Update related assignments
      await Assignment.updateMany(
        { subOrder: id, worker: workerId, status: { $in: ['assigned', 'in_progress'] } },
        { 
          completedPieces,
          damagedPieces,
          status: 'completed',
          completedBy: workerId,
          completedAt: new Date()
        },
        { session }
      );
    });

    res.json({
      success: true,
      message: 'SubOrder submitted for approval',
      data: {
        completedPieces,
        damagedPieces,
        status: 'pending_approval'
      }
    });

  } catch (error) {
    console.error('submitSubOrder error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Server error' });
  } finally {
    session.endSession();
  }
};

/**
 * GET /api/suborders/my-work
 * Get suborders assigned to current worker
 */
export const getMySubOrders = async (req, res) => {
  try {
    const workerId = req.user?._id;
    if (!workerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const assignments = await Assignment.find({
      $or: [
        { worker: workerId },
        { completedBy: workerId }
      ]
    }).select('subOrder').lean();

    const subOrderIds = assignments.map(a => a.subOrder);

    const subOrders = await SubOrder.find({
      _id: { $in: subOrderIds }
    })
    .populate({
      path: 'order',
      select: 'orderId styleSnapshot',
      populate: {
        path: 'style',
        select: 'name steps'
      }
    })
    .sort({ updatedAt: -1 })
    .lean();

    res.json({
      success: true,
      subOrders
    });

  } catch (error) {
    console.error('getMySubOrders error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

export const updateInventoryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inventoryStatus,
      inventoryLocation = '',
      inventoryNotes = '',
      saleReference = ''
    } = req.body;

    if (!canManageInventory(req.user)) {
      return res.status(403).json({ success: false, message: `Only admin and ${INVENTORY_WORKER_TYPE} workers can manage inventory` });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid suborder ID' });
    }

    if (!INVENTORY_STATUSES.includes(inventoryStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid inventory status' });
    }

    const subOrder = await SubOrder.findById(id);
    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'SubOrder not found' });
    }

    subOrder.inventoryStatus = inventoryStatus;
    subOrder.inventoryLocation = inventoryLocation;
    subOrder.inventoryNotes = inventoryNotes;
    subOrder.saleReference = saleReference;
    subOrder.inventoryUpdatedAt = new Date();
    subOrder.inventoryUpdatedByName = req.user?.name || 'Unknown';
    subOrder.inventoryUpdatedByRole = req.user?.role || 'unknown';
    subOrder.inventoryEvents = [
      {
        status: inventoryStatus,
        location: inventoryLocation,
        notes: inventoryNotes,
        saleReference,
        updatedAt: new Date(),
        updatedByName: req.user?.name || 'Unknown',
        updatedByRole: req.user?.role || 'unknown'
      },
      ...(subOrder.inventoryEvents || [])
    ].slice(0, 20);

    await subOrder.save();

    return res.json({
      success: true,
      message: 'Inventory updated successfully',
      subOrder
    });
  } catch (error) {
    console.error('updateInventoryRecord error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
