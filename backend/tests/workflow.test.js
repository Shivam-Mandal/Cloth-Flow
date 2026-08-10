import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { buildReadySubOrderQuery } from '../controllers/orderController.js';
import { calculateStageEarnings, calculateStageEarningsForSubOrders } from '../services/workflowService.js';
import { normalizeStageKey } from '../utils/workflow.js';

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
