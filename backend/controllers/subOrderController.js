// controllers/subOrderController.js
import mongoose from 'mongoose';
import SubOrder from '../models/SubOrderSchema.js';
import Assignment from '../models/Assignment.js';

/**
 * POST /api/suborders/:id/submit
 * Submit a suborder for admin approval (no immediate payment)
 */
export const submitSubOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { completedPieces, damagedPieces } = req.body;
    const workerId = req.user?._id;

    if (!workerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid suborder ID' });
    }

    await session.withTransaction(async () => {
      const subOrder = await SubOrder.findById(id).session(session);

      if (!subOrder) {
        throw new Error('SubOrder not found');
      }

      if (subOrder.status !== 'in_progress') {
        throw new Error('SubOrder must be in progress to submit');
      }

      const totalPieces = completedPieces + damagedPieces;

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
        { subOrder: id },
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
    res.status(500).json({ error: error.message || 'Server error' });
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