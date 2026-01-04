// controllers/assignmentController.js
import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import Order from '../models/Order.js';
import SubOrder from '../models/SubOrderSchema.js';
import { createNextStageAssignments, isStageCompleted } from './orderController.js';
import { WorkerModel } from '../models/Worker.js';
import ApprovalHistory from '../models/ApprovalHistory.js';

console.log('Loaded assignmentController from', typeof import.meta !== 'undefined' ? import.meta.url : __filename);

/**
 * Helper function to log approval history for submission
 */
const logApprovalHistoryForSubmission = async (subOrder, workerId) => {
  try {
    const historyEntry = new ApprovalHistory({
      subOrder: subOrder._id,
      order: subOrder.order,
      action: 'submitted',
      actor: workerId,
      actorRole: 'worker',
      previousStatus: 'in_progress',
      newStatus: subOrder.status,
      metadata: {
        subOrderName: subOrder.name,
        orderId: subOrder.orderId,
        stage: subOrder.currentStage,
        progress: subOrder.progress
      }
    });
    await historyEntry.save();
  } catch (error) {
    console.error('Failed to log submission history:', error);
  }
};

/**
 * GET /api/assignments/available
 */
export const getAvailableAssignments = async (req, res) => {
  // try {
  //   const assignments = await Assignment.find({ status: 'available' })
  //     .populate({ path: 'order', select: 'orderId styleSnapshot priority deadline totalQuantity' })
  //     .populate({ path: 'subOrder' })
  //     .sort({ createdAt: 1 })
  //     .lean();
  //   res.json(assignments);
  // } catch (err) {
  //   console.error('getAvailableAssignments error:', err);
  //   res.status(500).json({ error: 'Server error' });
  // }
  try {
    const { stage } = req.query;
    const query = { status: 'available' };

    if (stage) {
      query.stage = stage;
    }

    const assignments = await Assignment.find(query)
      .populate({
        path: 'order',
        populate: {
          path: 'style'
          // Include all style fields
        }
      })
      .populate('subOrder')
      .sort({ 'order.priority': -1 });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/assignments/available-for-me
 */
export const getAvailableForMe = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const worker = await WorkerModel.findById(userId).lean();
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    const workerType = worker.workerType;
    if (!workerType) return res.status(400).json({ success: false, message: 'Worker type missing' });

    const regex = new RegExp(workerType, 'i');

    const assignments = await Assignment.find({
      status: 'available',
      $or: [
        { stage: regex },
        { category: regex },
        { requiredRole: regex },
        { requiredRoles: regex },
        // note: order.category is not a direct queryable field unless you populate / denormalize.
        // but keeping this in case you have a denormalized field on Assignment named 'order.category'
      ]
    })
      .populate({
        path: 'order',
        select: 'orderId styleSnapshot priority deadline totalQuantity category stages style',
        populate: {
          path: 'style'
          // Don't select specific fields — include all, especially photos
        }
      })
      .populate('subOrder')
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ success: true, assignments });
  } catch (err) {
    console.error('getAvailableForMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/assignments/:id/pick
 * Atomically claim assignment if still available.
 */
export const pickAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid assignment id' });
    }

    const workerId = req.body.workerId || req.user?.id;
    if (!workerId) return res.status(400).json({ error: 'workerId required' });

    // Prevent multiple assigned tasks (simple guard)
    const active = await Assignment.countDocuments({ worker: workerId, status: 'assigned' }).exec();
    if (active > 0) {
      return res.status(409).json({ error: 'Finish your current assignment before picking another.' });
    }

    // Try claiming with 'worker' field
    let updated = await Assignment.findOneAndUpdate(
      { _id: id, status: 'available' },
      { $set: { status: 'assigned', worker: workerId, assignedAt: new Date() } },
      { new: true, runValidators: true }
    ).populate({
      path: 'order',
      populate: {
        path: 'style'
        // Include all style fields
      }
    }).populate('subOrder').exec();

    // fallback to 'assignedTo' if schema uses that
    if (!updated) {
      updated = await Assignment.findOneAndUpdate(
        { _id: id, status: 'available' },
        { $set: { status: 'assigned', assignedTo: workerId, assignedAt: new Date() } },
        { new: true, runValidators: true }
      ).populate({
        path: 'order',
        populate: {
          path: 'style'
          // Include all style fields
        }
      }).populate('subOrder').exec();
    }

    if (!updated) {
      return res.status(409).json({ error: 'Assignment already taken or not found' });
    }

    // increment subOrder.assignedWorkers if applicable
    if (updated.subOrder) {
      try {
        const subOrderId = updated.subOrder._id ? updated.subOrder._id : updated.subOrder;
        if (mongoose.Types.ObjectId.isValid(subOrderId)) {
          await SubOrder.findByIdAndUpdate(subOrderId, { $inc: { assignedWorkers: 1 } }).exec();
        } else {
          console.warn('Invalid subOrder id:', subOrderId);
        }
      } catch (e) {
        console.warn('Failed to increment suborder.assignedWorkers:', e);
      }
    }

    return res.json({ success: true, assignment: updated });
  } catch (err) {
    console.error('pickAssignment error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
};

/**
 * GET /api/assignments/:id
 */
export const getAssignmentById = async (req, res) => {
  try {
    const a = await Assignment.findById(req.params.id).populate({
      path: 'order',
      populate: {
        path: 'style'
        // Include all style fields
      }
    }).populate('subOrder');
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch (err) {
    console.error('getAssignmentById error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/assignments/:id/complete
 * Marks an assignment complete, updates related subOrder progress, and attempts to move order to next stage.
 */

const STAGE_SEQUENCE = {
  'Cutting': 'Printing',
  'Printing': 'Stitching',
  'Stitching': 'Finishing',
  'Finishing': 'Packing',
  'Packing': 'Sale out',
  // add other stages as needed
};
export const completeAssignment = async (req, res) => {
  const session = await mongoose.startSession();
  let finalSubOrder = null;

  try {
    const assignmentId =
      req.params?.assignmentId ||
      req.params?.id ||
      req.body?.assignmentId ||
      req.body?.id;

    const workerId = req.user?._id || req.user?.id || null;
    if (!workerId) return res.status(401).json({ error: 'Unauthorized' });

    if (!assignmentId || !mongoose.Types.ObjectId.isValid(String(assignmentId))) {
      return res.status(400).json({ error: 'Invalid assignmentId' });
    }

    await session.withTransaction(async () => {
      // Load the assignment, ensure it is assigned
      const assignment = await Assignment.findById(assignmentId)
        .populate('order')
        .populate('subOrder')
        .session(session);

      if (!assignment) {
        const e = new Error('Assignment not found');
        e.status = 404;
        throw e;
      }

      if (assignment.status !== 'assigned') {
        const e = new Error('Assignment must be in assigned state to complete');
        e.status = 400;
        throw e;
      }

      // permission: owner or admin
      const isOwner = assignment.worker && String(assignment.worker) === String(workerId);
      const isAdmin = req.user?.role === 'admin';
      if (!isOwner && !isAdmin) {
        const e = new Error('Not allowed to complete this assignment');
        e.status = 403;
        throw e;
      }

      // validate piece counts
      const completedPieces = req.body.completedPieces || 0;
      const damagedPieces = req.body.damagedPieces || 0;
      const totalReported = completedPieces + damagedPieces;
      if (totalReported !== assignment.totalPieces) {
        const e = new Error(`Completed pieces (${completedPieces}) + damaged pieces (${damagedPieces}) must equal total pieces (${assignment.totalPieces})`);
        e.status = 400;
        throw e;
      }

      // mark assignment completed
      assignment.status = 'completed';
      assignment.completedAt = new Date();
      assignment.completedBy = workerId;
      assignment.completedPieces = completedPieces;
      assignment.damagedPieces = damagedPieces;
      assignment.damagedReason = req.body.damagedReason || '';
      await assignment.save({ session });

      // decrement assignedWorkers on subOrder safely (clamp to 0 later)
      const subOrderRef = assignment.subOrder;
      const subOrderId = subOrderRef?._id || subOrderRef;

      if (subOrderId && mongoose.Types.ObjectId.isValid(String(subOrderId))) {
        await SubOrder.findByIdAndUpdate(subOrderId, { $inc: { assignedWorkers: -1 } }, { session }).exec();
        // clamp negative assignedWorkers to 0
        await SubOrder.updateOne({ _id: subOrderId, assignedWorkers: { $lt: 0 } }, { $set: { assignedWorkers: 0 } }, { session }).exec();
      }

      // compute progress for this subOrder based only on assignments of THIS stage
      const stage = assignment.stage;
      const [totalStageAssignments, completedStageAssignments] = await Promise.all([
        Assignment.countDocuments({ subOrder: subOrderId, stage }).session(session).exec(),
        Assignment.countDocuments({ subOrder: subOrderId, stage, status: 'completed' }).session(session).exec()
      ]);

      const progress = totalStageAssignments === 0 ? 100 : Math.floor((completedStageAssignments / totalStageAssignments) * 100);

      // update subOrder progress (inside session)
      if (subOrderId && mongoose.Types.ObjectId.isValid(String(subOrderId))) {
        await SubOrder.findByIdAndUpdate(subOrderId, { progress }, { session }).exec();
      }

      // if this completes the subOrder for the stage, create next-stage assignments
      if (progress === 100) {
        console.log('[completeAssignment] subOrder finished for stage=', stage, '; setting to pending approval');
        const orderId = assignment.order?._id || assignment.order;
        
        // Calculate total pieces from all completed assignments for this stage
        const stageAssignments = await Assignment.find({
          subOrder: subOrderId,
          stage: stage,
          status: 'completed'
        }).session(session);
        
        const totalCompletedPieces = stageAssignments.reduce((sum, a) => sum + (a.completedPieces || 0), 0);
        const totalDamagedPieces = stageAssignments.reduce((sum, a) => sum + (a.damagedPieces || 0), 0);
        
        // Update suborder with submission details for admin review
        await SubOrder.findByIdAndUpdate(subOrderId, { 
          status: 'pending_approval',
          completedBy: workerId,
          submittedPieces: totalCompletedPieces + totalDamagedPieces,
          approvedPieces: totalCompletedPieces, // Will be reviewed by admin
          faultyPieces: totalDamagedPieces
        }, { session }).exec();

        // Log submission to approval history
        const updatedSubOrder = await SubOrder.findById(subOrderId).session(session);
        await logApprovalHistoryForSubmission(updatedSubOrder, workerId);
        
        // Don't create next-stage assignments yet - wait for approval
        // const created = await createNextStageAssignments(orderId, stage, { session });
        // console.log('[completeAssignment] created next-stage assignments count:', (created || []).length);
      }

      // fetch updated subOrder within the transaction and expose it
      if (subOrderId && mongoose.Types.ObjectId.isValid(String(subOrderId))) {
        finalSubOrder = await SubOrder.findById(subOrderId).session(session).lean();
      }
    }); // end withTransaction

    // respond with updated subOrder details
    return res.json({
      message: 'Assignment completed successfully',
      subOrder: finalSubOrder
        ? {
            id: finalSubOrder._id,
            progress: finalSubOrder.progress,
            currentStage: finalSubOrder.currentStage
          }
        : null
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch (e) { /* ignore */ }
    console.error('completeAssignment error:', err);
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: err?.message || 'Server error' });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/assignments/:id/release
 * release assignment if owned by user
 */
export const releaseAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const workerId = req.user?.id;
    if (!workerId) return res.status(401).json({ error: 'Unauthorized' });

    const updated = await Assignment.findOneAndUpdate(
      { _id: id, worker: workerId, status: 'assigned' },
      { $set: { status: 'available', worker: null, assignedAt: null } },
      { new: true }
    ).populate('subOrder').exec();

    if (!updated) return res.status(404).json({ error: 'Assigned task not found or not owned by you' });

    if (updated.subOrder) {
      const subId = updated.subOrder._id ? updated.subOrder._id : updated.subOrder;
      try {
        await SubOrder.findByIdAndUpdate(subId, { $inc: { assignedWorkers: -1 } }).exec();
        await SubOrder.updateOne({ _id: subId, assignedWorkers: { $lt: 0 } }, { $set: { assignedWorkers: 0 } }).exec();
      } catch (e) {
        console.warn('Failed to decrement suborder.assignedWorkers on release:', e);
      }
    }

    return res.json({ success: true, assignment: updated });
  } catch (err) {
    console.error('releaseAssignment error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
};

/**
 * GET /api/assignments/for-me
 */
export const forMeAssignments = async (req, res) => {
  try {
    const workerId = req.user?.id;
    if (!workerId) return res.status(401).json({ error: 'Unauthorized' });

    const key = 'worker'; // change to 'assignedTo' if needed
    const filter = { [key]: workerId };

    if (req.query.status) filter.status = req.query.status;

    const assignments = await Assignment.find(filter)
      .populate({
        path: 'order',
        select: 'orderId styleSnapshot priority deadline totalQuantity style',
        populate: {
          path: 'style'
          // Include all style fields
        }
      })
      .populate({ path: 'subOrder' })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(assignments);
  } catch (err) {
    console.error('forMeAssignments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
