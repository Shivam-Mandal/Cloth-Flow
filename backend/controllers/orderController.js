// controllers/orderController.js
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { Style } from '../models/StyleSchema.js';
import Assignment from '../models/Assignment.js';
import SubOrder from '../models/SubOrderSchema.js';

/**
 * Helpers (pieces utilities)
 */
const computeTotalQuantity = (pieces = {}) => {
  let total = 0;
  for (const color of Object.keys(pieces || {})) {
    const sizes = pieces[color] || {};
    for (const size of Object.keys(sizes || {})) {
      const val = Number(sizes[size]) || 0;
      total += val;
    }
  }
  return total;
};

const flattenPiecesToSkus = (pieces = {}) => {
  const skus = [];
  for (const color of Object.keys(pieces || {})) {
    const sizes = pieces[color] || {};
    for (const size of Object.keys(sizes || {})) {
      const count = Number(sizes[size]) || 0;
      if (count > 0) skus.push({ color, size, count });
    }
  }
  return skus;
};

function flattenPieces(pieces = {}) {
  return flattenPiecesToSkus(pieces);
}

const distributePiecesEvenly = (piecesObj, k = 1) => {
  const skus = flattenPieces(piecesObj);
  const total = skus.reduce((s, it) => s + it.count, 0);
  if (k <= 0) k = 1;
  const base = Math.floor(total / k);
  const remainder = total % k;
  const quotas = Array.from({ length: k }, (_, i) => base + (i < remainder ? 1 : 0));
  const result = Array.from({ length: k }, () => ({ pieces: {}, totalPieces: 0 }));
  const remaining = quotas.slice();

  for (const sku of skus) {
    let qtyLeft = sku.count;
    let workerIndex = 0;
    while (qtyLeft > 0) {
      while (workerIndex < k && remaining[workerIndex] === 0) workerIndex++;
      if (workerIndex >= k) workerIndex = k - 1;
      const give = Math.min(qtyLeft, remaining[workerIndex] || qtyLeft);
      const target = result[workerIndex];
      if (!target.pieces[sku.color]) target.pieces[sku.color] = {};
      target.pieces[sku.color][sku.size] = (target.pieces[sku.color][sku.size] || 0) + give;
      target.totalPieces += give;
      if (remaining[workerIndex] > 0) remaining[workerIndex] -= give;
      qtyLeft -= give;
      if (remaining[workerIndex] === 0) workerIndex++;
    }
  }
  return result;
};

/* -----------------------
   Create assignments helpers (session-aware)
   ----------------------- */

const createAssignmentsPerSku = async (orderDoc, stage, opts = {}) => {
  const session = opts.session || null;
  const skus = flattenPiecesToSkus(orderDoc.pieces);
  const created = [];

  for (const sku of skus) {
    const skuPieces = { [sku.color]: { [sku.size]: sku.count } };

    const existingSub = await SubOrder.findOne({
      order: orderDoc._id,
      pieces: skuPieces,
      currentStage: stage
    }).session(session).lean();

    if (existingSub) {
      const existsAssign = await Assignment.exists({ order: orderDoc._id, subOrder: existingSub._id, stage }).session(session);
      if (!existsAssign) {
        const a = new Assignment({
          order: orderDoc._id,
          subOrder: existingSub._id,
          stage,
          requiredRole: stage,
          pieces: skuPieces,
          totalPieces: sku.count,
          status: 'available'
        });
        await a.save({ session });
        const populatedA = await Assignment.findById(a._id).populate('order').populate('subOrder').session(session);
        created.push({ assignment: populatedA, subOrder: existingSub });
      }
      continue;
    }

    const sub = new SubOrder({
      order: orderDoc._id,
      orderId: orderDoc.orderId,
      name: `${stage}-${sku.color}-${sku.size}`,
      pieces: skuPieces,
      currentStage: stage,
      progress: 0,
      assignedWorkers: 0,
      priority: orderDoc.priority,
      requiredKg: orderDoc.requiredKg
    });
    await sub.save({ session });

    const a = new Assignment({
      order: orderDoc._id,
      subOrder: sub._id,
      stage,
      requiredRole: stage,
      pieces: skuPieces,
      totalPieces: sku.count,
      status: 'available'
    });
    await a.save({ session });

    const populatedA = await Assignment.findById(a._id).populate('order').populate('subOrder').session(session);
    created.push({ assignment: populatedA, subOrder: sub });
  }

  return created;
};

const createAssignmentsForStage = async (orderDoc, stage, workersCount = 1, opts = {}) => {
  const session = opts.session || null;
  const distributed = distributePiecesEvenly(orderDoc.pieces, workersCount);
  const assignments = [];

  for (const chunk of distributed) {
    if (!chunk || chunk.totalPieces === 0) continue;

    const existing = await SubOrder.findOne({
      order: orderDoc._id,
      pieces: chunk.pieces,
      currentStage: stage
    }).session(session).lean();

    if (existing) {
      const existsAssign = await Assignment.exists({ order: orderDoc._id, subOrder: existing._id, stage }).session(session);
      if (!existsAssign) {
        const a = new Assignment({
          order: orderDoc._id,
          subOrder: existing._id,
          stage,
          requiredRole: stage,
          pieces: chunk.pieces,
          totalPieces: chunk.totalPieces,
          status: 'available'
        });
        await a.save({ session });
        const populatedA = await Assignment.findById(a._id).populate('order').populate('subOrder').session(session);
        assignments.push({ assignment: populatedA, subOrder: existing });
      }
      continue;
    }

    const sub = new SubOrder({
      order: orderDoc._id,
      orderId: orderDoc.orderId,
      name: `${stage}-batch`,
      pieces: chunk.pieces,
      currentStage: stage,
      progress: 0,
      assignedWorkers: 0,
      priority: orderDoc.priority,
      requiredKg: orderDoc.requiredKg
    });
    await sub.save({ session });

    const a = new Assignment({
      order: orderDoc._id,
      subOrder: sub._id,
      stage,
      requiredRole: stage,
      pieces: chunk.pieces,
      totalPieces: chunk.totalPieces,
      status: 'available'
    });
    await a.save({ session });

    const populatedA = await Assignment.findById(a._id).populate('order').populate('subOrder').session(session);
    assignments.push({ assignment: populatedA, subOrder: sub });
  }

  return assignments;
};

/**
 * createNextStageAssignments(orderId, stage, workersCount, opts = { session, distributionMode })
 * session-aware.
 */
export const createNextStageAssignments = async (orderId, currentStage, opts = {}) => {
  const session = opts.session || null;
  console.log('[createNextStageAssignments] orderId:', orderId, 'currentStage:', currentStage);

  if (!orderId) return [];
  if (typeof orderId === 'object' && orderId._id) orderId = orderId._id;
  if (!mongoose.Types.ObjectId.isValid(String(orderId))) throw new Error('Invalid orderId');

  const order = await Order.findById(orderId).session(session);
  if (!order) return [];

  // stage mapping - extend if necessary
  const STAGE_SEQUENCE = {
    'Cutting': 'Printing',
    'Printing': 'Stitching',
    'Stitching': 'Finishing',
    'Finishing': 'Packing',
    'Packing': 'Sale out'
  };

  const nextStage = STAGE_SEQUENCE[currentStage] || null;
  if (!nextStage) {
    console.log('[createNextStageAssignments] no nextStage for', currentStage);
    return [];
  }

  // Find subOrders that have completed the currentStage (progress === 100)
  const readySubOrders = await SubOrder.find({
    order: orderId,
    progress: 100,
    currentStage: currentStage
  }).session(session).lean();

  if (!readySubOrders || readySubOrders.length === 0) {
    console.log('[createNextStageAssignments] no ready subOrders for', orderId, currentStage);
    return [];
  }

  const created = [];

  for (const sub of readySubOrders) {
    const subId = sub._id;

    // For each ready subOrder, split its pieces into SKUs (color+size)
    const skus = flattenPiecesToSkus(sub.pieces || {});

    for (const sku of skus) {
      const skuPieces = { [sku.color]: { [sku.size]: sku.count } };

      // Try to find an existing subOrder for this exact SKU at the next stage
      let existingSub = await SubOrder.findOne({
        order: orderId,
        pieces: skuPieces,
        currentStage: nextStage
      }).session(session).lean();

      if (!existingSub) {
        // create a new subOrder for this SKU at nextStage
        const newSub = new SubOrder({
          order: orderId,
          orderId: order.orderId,
          name: `${nextStage}-${sku.color}-${sku.size}`,
          pieces: skuPieces,
          currentStage: nextStage,
          progress: 0,
          assignedWorkers: 0,
          priority: order.priority,
          requiredKg: order.requiredKg
        });
        await newSub.save({ session });
        existingSub = newSub.toObject ? newSub.toObject() : newSub;
      }

      // Skip duplicate assignment creation (idempotent)
      const existsAssign = await Assignment.exists({ order: orderId, subOrder: existingSub._id, stage: nextStage }).session(session);
      if (existsAssign) continue;

      // Create assignment for this SKU / subOrder
      const aDoc = {
        order: orderId,
        subOrder: existingSub._id,
        stage: nextStage,
        status: 'available',
        createdAt: new Date(),
        requiredRole: nextStage,
        pieces: skuPieces,
        totalPieces: sku.count,
        priority: order.priority || null
      };

      const [createdA] = await Assignment.create([aDoc], { session });
      const populated = await Assignment.findById(createdA._id).populate('order').populate('subOrder').session(session);
      if (populated) {
        created.push({ assignment: populated, subOrder: existingSub });
        console.log('[createNextStageAssignments] created assignment', {
          id: populated._id.toString(),
          stage: populated.stage,
          order: String(orderId)
        });
      }
    } // end for each sku
  } // end for each ready suborder

  console.log(`[createNextStageAssignments] total created for nextStage=${nextStage}:`, created.length);
  return created;
};

/**
 * isStageCompleted(orderId, stage, opts = { session })
 * Returns true if all assignments for order+stage are completed OR if fallback subOrder.progress indicates completion.
 */
export const isStageCompleted = async (orderId, stage, opts = {}) => {
  const session = opts?.session || null;
  if (!mongoose.Types.ObjectId.isValid(String(orderId))) return false;

  // Count assignments for this order+stage
  const totalAssignments = await Assignment.countDocuments({ order: orderId, stage }).session(session).exec();

  if (totalAssignments > 0) {
    const incomplete = await Assignment.countDocuments({ order: orderId, stage, status: { $ne: 'completed' } }).session(session).exec();
    return incomplete === 0;
  }

  // fallback: check subOrders for this order - consider stage complete if no suborder has progress < 100
  const remaining = await SubOrder.countDocuments({ order: orderId, progress: { $lt: 100 } }).session(session).exec();
  return remaining === 0;
};

/* -----------------------
   Controller actions
   ----------------------- */

export const createOrder = async (req, res) => {
  try {
    const {
      styleId,
      pieces = {},
      deadline,
      priority,
      distributionMode = 'perSku',
      workersCount = 1
    } = req.body;

    if (!styleId) return res.status(400).json({ error: 'styleId required' });

    const style = await Style.findById(styleId);
    if (!style) return res.status(404).json({ error: 'Style not found' });

    const totalQuantity = computeTotalQuantity(pieces);

    const order = new Order({
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      style: style._id,
      styleSnapshot: { name: style.name, sizes: style.sizes, colors: style.colors },
      pieces,
      totalQuantity,
      deadline,
      priority,
      createdBy: req.user?.id
    });
    await order.save();

    let created;
    if (distributionMode === 'byWorkers') {
      created = await createAssignmentsForStage(order, 'Cutting', Number(workersCount) || 1, { session: null });
    } else {
      created = await createAssignmentsPerSku(order, 'Cutting', { session: null });
    }

    return res.status(201).json({
      order,
      created
    });
  } catch (err) {
    console.error('createOrder error:', err);
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      message: err?.message || 'Internal Server Error',
      ...(isDev ? { stack: err?.stack } : {})
    });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('style', 'name').sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    console.error('getOrders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('style', 'name sizes colors');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const subOrders = await SubOrder.find({ order: order._id }).sort({ createdAt: 1 }).lean();
    const assignments = await Assignment.find({ order: order._id }).sort({ createdAt: 1 }).lean();

    res.json({ order, subOrders, assignments });
  } catch (err) {
    console.error('getOrder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const up = req.body;
    if (up.pieces) {
      order.pieces = up.pieces;
      order.totalQuantity = computeTotalQuantity(up.pieces);
    }

    ['priority', 'deadline'].forEach(k => {
      if (up[k] !== undefined) order[k] = up[k];
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error('updateOrder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await SubOrder.deleteMany({ order: order._id }).catch(e => console.error('Failed delete suborders:', e));
    await Assignment.deleteMany({ order: order._id }).catch(e => console.error('Failed delete assignments:', e));

    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('deleteOrder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
