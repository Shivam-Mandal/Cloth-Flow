import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import Assignment from '../models/Assignment.js';
import Order from '../models/Order.js';
import SubOrder from '../models/SubOrderSchema.js';
import { Style } from '../models/StyleSchema.js';
import { approveWorkflowStage } from '../services/workflowService.js';

const TEST_DATABASE_URI = process.env.TEST_DATABASE_URI;

const cleanup = async () => {
  await Promise.all([
    Assignment.deleteMany({}),
    SubOrder.deleteMany({}),
    Order.deleteMany({}),
    Style.deleteMany({})
  ]);
};

if (!TEST_DATABASE_URI) {
  console.warn('Skipping MongoDB workflow integration test: set TEST_DATABASE_URI to run it.');
} else {
test('integration: approving a final-stage suborder creates earnings and inventory exactly once', async () => {
  await mongoose.connect(TEST_DATABASE_URI);
  await cleanup();

  try {
    const style = await Style.create({
      name: 'Integration Style',
      skuId: `INT-${Date.now()}`,
      sizes: ['M'],
      colors: ['Blue'],
      steps: [{ label: 'Packing', price: 4 }]
    });
    const order = await Order.create({
      orderId: `ORD-INT-${Date.now()}`,
      style: style._id,
      styleSnapshot: {
        name: style.name,
        sizes: style.sizes,
        colors: style.colors,
        steps: [{ label: 'Packing', price: 4 }]
      },
      pieces: { Blue: { M: 10 } },
      totalQuantity: 10,
      stages: ['Packing']
    });
    const subOrder = await SubOrder.create({
      order: order._id,
      orderId: order.orderId,
      name: 'Packing-Blue-M',
      currentStage: 'Packing',
      progress: 100,
      status: 'pending_approval',
      approvedPieces: 8,
      faultyPieces: 2
    });
    await Assignment.create({
      order: order._id,
      subOrder: subOrder._id,
      stage: 'Packing',
      requiredRole: 'Packing',
      totalPieces: 10,
      status: 'completed',
      completedPieces: 8,
      damagedPieces: 2
    });

    const populated = await SubOrder.findById(subOrder._id).populate({
      path: 'order',
      populate: { path: 'style' }
    });
    const first = await approveWorkflowStage(populated, { adminId: new mongoose.Types.ObjectId() });
    await assert.rejects(
      () => approveWorkflowStage(populated, { adminId: new mongoose.Types.ObjectId() }),
      /already processed/
    );

    const saved = await SubOrder.findById(subOrder._id).lean();
    assert.equal(first.amount, 32);
    assert.equal(saved.status, 'completed');
    assert.equal(saved.workerEarnings, 32);
    assert.equal(saved.inventoryStatus, 'ready_for_sale');
    assert.equal(saved.inventoryEvents.length, 1);
  } finally {
    await cleanup();
    await mongoose.disconnect();
  }
});
}
