import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import { createNextStageAssignments } from '../controllers/orderController.js';
import { isLastStage, normalizeStageKey } from '../utils/workflow.js';

export const calculateStageEarnings = (subOrder) => {
  const approvedPieces = Number(subOrder?.approvedPieces) || 0;
  const steps = subOrder?.order?.style?.steps || [];
  const currentStage = normalizeStageKey(subOrder?.currentStage);
  const currentStageStep = steps.find((step) => normalizeStageKey(step?.label) === currentStage);
  const pricePerPiece = Number(currentStageStep?.price) || 0;

  return {
    pricePerPiece,
    amount: approvedPieces * pricePerPiece
  };
};

export const approveWorkflowStage = async (subOrder, { adminId, session, io } = {}) => {
  const finalStage = isLastStage(subOrder.order, subOrder.currentStage);
  const { amount, pricePerPiece } = calculateStageEarnings(subOrder);

  subOrder.status = finalStage ? 'completed' : 'approved';
  subOrder.approvedBy = adminId;
  subOrder.approvedAt = new Date();
  subOrder.pricePerPiece = pricePerPiece;
  subOrder.amount = amount;
  subOrder.workerEarnings = amount;
  await subOrder.save({ session });

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
    await createNextStageAssignments(subOrder.order._id, subOrder.currentStage, { session });
  }

  return { amount, pricePerPiece, finalStage };
};

export const rejectWorkflowStage = async (subOrder, { session } = {}) => {
  subOrder.status = 'in_progress';
  subOrder.progress = 0;
  subOrder.approvedAt = null;
  subOrder.approvedBy = null;
  subOrder.amount = 0;
  subOrder.workerEarnings = 0;

  const updateResult = await Assignment.updateMany(
    { subOrder: subOrder._id, status: 'completed' },
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

  subOrder.assignedWorkers = updateResult.modifiedCount || updateResult.nModified || 0;
  await subOrder.save({ session });

  return subOrder;
};

export const assertObjectId = (id, message = 'Invalid id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
};
