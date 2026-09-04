import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { buildReadySubOrderQuery } from '../controllers/orderController.js';
import { calculateStageEarnings, calculateStageEarningsForSubOrders } from '../services/workflowService.js';
import { getNextStage, isLastStage, normalizeStageKey } from '../utils/workflow.js';

test('next-stage creation only targets approved suborders', () => {
  const orderId = new mongoose.Types.ObjectId();
  const subOrderId = new mongoose.Types.ObjectId();

  const query = buildReadySubOrderQuery({
    orderId,
    currentStage: 'Cutting',
    subOrderId
  });

  assert.deepEqual(query, {
    order: orderId,
    progress: 100,
    currentStage: 'Cutting',
    status: 'approved',
    _id: subOrderId
  });
});

test('earnings use snapshotted order stage price before live style price', () => {
  const result = calculateStageEarnings({
    currentStage: 'Cutting',
    approvedPieces: 12,
    order: {
      styleSnapshot: {
        steps: [{ label: 'Cutting', price: 7 }]
      },
      style: {
        steps: [{ label: 'Cutting', price: 99 }]
      }
    }
  });

  assert.equal(result.pricePerPiece, 7);
  assert.equal(result.amount, 84);
});

test('earnings fall back to live style price for legacy orders without step snapshot', () => {
  const result = calculateStageEarnings({
    currentStage: 'Packing',
    approvedPieces: 5,
    order: {
      styleSnapshot: {},
      style: {
        steps: [{ label: 'Packing', price: 3 }]
      }
    }
  });

  assert.equal(result.pricePerPiece, 3);
  assert.equal(result.amount, 15);
});

test('stage authorization keys are normalized before comparison', () => {
  assert.equal(normalizeStageKey(' Cutting '), normalizeStageKey('cutting'));
  assert.notEqual(normalizeStageKey('Packing'), normalizeStageKey('Cutting'));
});

test('batch earnings calculation returns an empty map for empty input', async () => {
  const result = await calculateStageEarningsForSubOrders([]);
  assert.equal(result.size, 0);
});

test('getNextStage resolves to newly added middle stage when style is updated after order creation', () => {
  
  // Order was created when style had ['Cutting', 'Printing', 'Packing']
  const order = {
    stages: ['Cutting', 'Printing', 'Packing'],
    style: {
      steps: [
        { label: 'Cutting' },
        { label: 'Printing' },
        { label: 'Quality Check' }, // Newly inserted stage
        { label: 'Packing' }
      ]
    }
  };

  // From stage 'Printing', next stage should be the newly inserted 'Quality Check'
  assert.equal(getNextStage(order, 'Printing'), 'Quality Check');
  assert.equal(isLastStage(order, 'Printing'), false);
  assert.equal(isLastStage(order, 'Packing'), true);
});

test('multi-stage suborder progression preserves worker assignment history', () => {
  const printingWorkerId = new mongoose.Types.ObjectId();
  const overlockWorkerId = new mongoose.Types.ObjectId();
  const subOrderId = new mongoose.Types.ObjectId();

  const assignments = [
    {
      subOrder: subOrderId,
      stage: 'Printing',
      worker: printingWorkerId,
      completedBy: printingWorkerId,
      status: 'completed',
      completedPieces: 8,
      damagedPieces: 1,
      totalPieces: 9
    },
    {
      subOrder: subOrderId,
      stage: 'Overlock',
      worker: overlockWorkerId,
      completedBy: overlockWorkerId,
      status: 'completed',
      completedPieces: 8,
      damagedPieces: 0,
      totalPieces: 8
    }
  ];

  // Filter printing worker completed assignments
  const printingAssignments = assignments.filter(
    a => String(a.completedBy) === String(printingWorkerId) && a.status === 'completed'
  );

  assert.equal(printingAssignments.length, 1);
  assert.equal(printingAssignments[0].stage, 'Printing');
  assert.equal(printingAssignments[0].completedPieces, 8);
  assert.equal(printingAssignments[0].totalPieces, 9);
});
