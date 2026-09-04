import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import SubOrder from '../models/SubOrderSchema.js';
import { createNextStageAssignments } from '../controllers/orderController.js';
import { isLastStage, normalizeStageKey } from '../utils/workflow.js';

const getStagePricePerPiece = (subOrder) => {
  const snapshotSteps = subOrder?.order?.styleSnapshot?.steps || [];
  const liveSteps = subOrder?.order?.style?.steps || [];
  const steps = snapshotSteps.length ? snapshotSteps : liveSteps;
  const currentStage = normalizeStageKey(subOrder?.currentStage);
  let currentStageStep = steps.find((step) => normalizeStageKey(step?.label) === currentStage);
  if (!currentStageStep && liveSteps.length) {
    currentStageStep = liveSteps.find((step) => normalizeStageKey(step?.label) === currentStage);
  }
  return Number(currentStageStep?.price) || 0;
};

export const calculateStageEarnings = (subOrder, options = {}) => {
  const completedPieces = Number(options.completedPieces ?? subOrder?.approvedPieces) || 0;
  const pricePerPiece = getStagePricePerPiece(subOrder);

  return {
    completedPieces,
    pricePerPiece,
    amount: completedPieces * pricePerPiece
  };
};

export const calculateStageEarningsFromAssignments = async (subOrder, { session } = {}) => {
  const assignments = await Assignment.find({
    subOrder: subOrder._id,
    stage: subOrder.currentStage,
    status: 'completed'
  }).session(session).lean();

  const completedPieces = assignments.length
    ? assignments.reduce((sum, assignment) => sum + (Number(assignment.completedPieces) || 0), 0)
    : Number(subOrder?.approvedPieces) || 0;
  const damagedPieces = assignments.length
    ? assignments.reduce((sum, assignment) => sum + (Number(assignment.damagedPieces) || 0), 0)
    : Number(subOrder?.faultyPieces) || 0;
  const { amount, pricePerPiece } = calculateStageEarnings(subOrder, { completedPieces });

  return {
    amount,
    pricePerPiece,
    completedPieces,
    damagedPieces,
    submittedPieces: completedPieces + damagedPieces
  };
};

export const calculateStageEarningsForSubOrders = async (subOrders = [], { session } = {}) => {
  const safeSubOrders = Array.isArray(subOrders) ? subOrders.filter(Boolean) : [];
  if (safeSubOrders.length === 0) return new Map();

  const subOrderIds = safeSubOrders.map((subOrder) => subOrder._id).filter(Boolean);
  const assignments = await Assignment.find({
    subOrder: { $in: subOrderIds },
    status: 'completed'
  })
    .select('subOrder stage completedPieces damagedPieces')
    .session(session)
    .lean();

  const assignmentTotals = assignments.reduce((map, assignment) => {
    const key = `${assignment.subOrder}:${normalizeStageKey(assignment.stage)}`;
    const current = map.get(key) || { completedPieces: 0, damagedPieces: 0 };
    current.completedPieces += Number(assignment.completedPieces) || 0;
    current.damagedPieces += Number(assignment.damagedPieces) || 0;
    map.set(key, current);
    return map;
  }, new Map());

  return safeSubOrders.reduce((map, subOrder) => {
    const key = `${subOrder._id}:${normalizeStageKey(subOrder.currentStage)}`;
    const totals = assignmentTotals.get(key);
    const completedPieces = totals
      ? totals.completedPieces
      : Number(subOrder?.approvedPieces) || 0;
    const damagedPieces = totals
      ? totals.damagedPieces
      : Number(subOrder?.faultyPieces) || 0;
    const { amount, pricePerPiece } = calculateStageEarnings(subOrder, { completedPieces });

    map.set(String(subOrder._id), {
      amount,
      pricePerPiece,
      completedPieces,
      damagedPieces,
      submittedPieces: completedPieces + damagedPieces
    });
    return map;
  }, new Map());
};

export const approveWorkflowStage = async (subOrder, { adminId, session, io } = {}) => {
  const finalStage = isLastStage(subOrder.order, subOrder.currentStage);
  const approvalDate = new Date();
  const {
    amount,
    pricePerPiece,
    completedPieces,
    damagedPieces,
    submittedPieces
  } = await calculateStageEarningsFromAssignments(subOrder, { session });

  const nextStatus = finalStage ? 'completed' : 'approved';
  const update = {
    $set: {
      status: nextStatus,
      approvedBy: adminId,
      approvedAt: approvalDate,
      submittedPieces,
      approvedPieces: completedPieces,
      faultyPieces: damagedPieces,
      pricePerPiece,
      amount,
      workerEarnings: amount
    }
  };

  if (finalStage) {
    update.$set.inventoryStatus = 'ready_for_sale';
    update.$set.inventorySourceStage = subOrder.currentStage;
    update.$set.inventoryUpdatedAt = approvalDate;
    update.$set.inventoryUpdatedByName = 'System';
    update.$set.inventoryUpdatedByRole = 'system';
    update.$push = {
      inventoryEvents: {
        $each: [{
          status: 'ready_for_sale',
          location: '',
          notes: `Moved to inventory after ${subOrder.currentStage} stage approval`,
          saleReference: '',
          updatedAt: approvalDate,
          updatedByName: 'System',
          updatedByRole: 'system'
        }],
        $position: 0,
        $slice: 20
      }
    };
  }

  const approvedSubOrder = await SubOrder.findOneAndUpdate(
    { _id: subOrder._id, status: 'pending_approval' },
    update,
    { new: true, runValidators: true, session }
  );

  if (!approvedSubOrder) {
    const error = new Error('SubOrder is not pending approval or was already processed');
    error.status = 409;
    throw error;
  }

  Object.assign(subOrder, approvedSubOrder.toObject ? approvedSubOrder.toObject() : approvedSubOrder);

  if (io && subOrder.completedBy) {
    io.emit(`worker-${subOrder.completedBy}`, {
      type: 'APPROVAL_APPROVED',
      subOrder: {
        _id: subOrder._id,
        name: subOrder.name,
        currentStage: subOrder.currentStage,
        amount,
        status: subOrder.status
      }
    });
  }

  if (!finalStage) {
    const orderId = subOrder.order?._id || subOrder.order;
    await createNextStageAssignments(orderId, subOrder.currentStage, { session, subOrderId: subOrder._id });
  }

  return { amount, pricePerPiece, finalStage };
};

export const rejectWorkflowStage = async (subOrder, { session } = {}) => {
  const rejectedSubOrder = await SubOrder.findOneAndUpdate(
    { _id: subOrder._id, status: 'pending_approval' },
    {
      $set: {
        status: 'in_progress',
        progress: 0,
        approvedAt: null,
        approvedBy: null,
        amount: 0,
        workerEarnings: 0,
        inventoryStatus: 'not_ready',
        inventorySourceStage: ''
      }
    },
    { new: true, runValidators: true, session }
  );

  if (!rejectedSubOrder) {
    const error = new Error('SubOrder is not pending approval or was already processed');
    error.status = 409;
    throw error;
  }

  const updateResult = await Assignment.updateMany(
    { subOrder: subOrder._id, stage: subOrder.currentStage },
    {
      status: 'assigned',
      worker: subOrder.completedBy,
      assignedAt: new Date(),
      completedAt: null,
      completedBy: null,
      completedPieces: 0,
      damagedPieces: 0,
      damagedReason: ''
    },
    { session }
  );

  rejectedSubOrder.assignedWorkers = updateResult.modifiedCount || updateResult.nModified || 0;
  await rejectedSubOrder.save({ session });
  Object.assign(subOrder, rejectedSubOrder.toObject ? rejectedSubOrder.toObject() : rejectedSubOrder);

  return subOrder;
};

export const assertObjectId = (id, message = 'Invalid id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
};
