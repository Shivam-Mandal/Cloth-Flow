// controllers/orderController.js
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { Style } from '../models/StyleSchema.js';
import Assignment from '../models/Assignment.js';
import SubOrder from '../models/SubOrderSchema.js';
import { getFirstStage, getNextStage, getOrderStages, normalizeStageLabel } from '../utils/workflow.js';

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

const clampProgress = (value) => {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
};

const enrichOrdersWithProgress = async (orders = []) => {
  if (!orders.length) return orders;

  const orderIds = orders.map((order) => order._id).filter(Boolean);
  const subOrders = await SubOrder.find({ order: { $in: orderIds } })
    .select('order currentStage progress assignedWorkers status')
    .lean();

  const subOrdersByOrder = subOrders.reduce((map, subOrder) => {
    const key = String(subOrder.order);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(subOrder);
    return map;
  }, new Map());

  return orders.map((order) => {
    const orderSubOrders = subOrdersByOrder.get(String(order._id)) || [];
    if (!orderSubOrders.length) {
      return {
        ...order,
        currentStage: order.currentStage || 'Pending',
        progress: clampProgress(order.progress),
        assignedWorkers: Number(order.assignedWorkers) || 0
      };
    }

    const totalProgress = orderSubOrders.reduce((sum, subOrder) => sum + clampProgress(subOrder.progress), 0);
    const progress = clampProgress(totalProgress / orderSubOrders.length);
    const activeSubOrder = orderSubOrders.find((subOrder) => clampProgress(subOrder.progress) < 100) || orderSubOrders[orderSubOrders.length - 1];
    const assignedWorkers = orderSubOrders.reduce((sum, subOrder) => sum + (Number(subOrder.assignedWorkers) || 0), 0);

    return {
      ...order,
      currentStage: activeSubOrder?.currentStage || 'Pending',
      progress,
      assignedWorkers
    };
  });
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

const alignPiecesToCount = (pieces = {}, targetCount = 0) => {
  const normalizedTarget = Math.max(0, Number(targetCount) || 0);
  if (normalizedTarget === 0) return {};

  const skus = flattenPiecesToSkus(pieces);
  const total = skus.reduce((sum, sku) => sum + sku.count, 0);

  if (skus.length === 0) {
    return {};
  }

  if (normalizedTarget === total) {
    return pieces;
  }

  if (normalizedTarget > total) {
    const expanded = {};
    skus.forEach((sku, index) => {
      const nextCount = index === 0 ? sku.count + (normalizedTarget - total) : sku.count;
      if (!expanded[sku.color]) expanded[sku.color] = {};
      expanded[sku.color][sku.size] = nextCount;
    });
    return expanded;
  }

  let remaining = normalizedTarget;
  const trimmed = {};

  for (const sku of skus) {
    if (remaining <= 0) break;

    const nextCount = Math.min(sku.count, remaining);
    if (nextCount <= 0) continue;

    if (!trimmed[sku.color]) trimmed[sku.color] = {};
    trimmed[sku.color][sku.size] = nextCount;
    remaining -= nextCount;
  }

  return trimmed;
};

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
export const buildReadySubOrderQuery = ({ orderId, currentStage, subOrderId = null }) => {
  const query = {
    order: orderId,
    progress: 100,
    currentStage,
    status: 'approved'
  };

  if (subOrderId) {
    if (!mongoose.Types.ObjectId.isValid(String(subOrderId))) throw new Error('Invalid subOrderId');
    query._id = subOrderId;
  }

  return query;
};

export const createNextStageAssignments = async (orderId, currentStage, opts = {}) => {
  const session = opts.session || null;
  const subOrderId = opts.subOrderId || null;

  if (!orderId) return [];
  if (typeof orderId === 'object' && orderId._id) orderId = orderId._id;
  if (!mongoose.Types.ObjectId.isValid(String(orderId))) throw new Error('Invalid orderId');

  const order = await Order.findById(orderId).session(session);
  if (!order) return [];

  const nextStage = getNextStage(order, currentStage);
  if (!nextStage) {
    return [];
  }

  // Find subOrders that have completed the currentStage (progress === 100)
  const readySubOrders = await SubOrder.find(
    buildReadySubOrderQuery({ orderId, currentStage, subOrderId })
  ).session(session).lean();

  if (!readySubOrders || readySubOrders.length === 0) {
    return [];
  }

  const created = [];

  for (const sub of readySubOrders) {
    const approvedCount = Math.max(0, Number(sub.approvedPieces) || 0);
    const sourcePieces = approvedCount > 0
      ? alignPiecesToCount(sub.pieces || {}, approvedCount)
      : (sub.pieces || {});

    const nextStageTotalPieces = flattenPiecesToSkus(sourcePieces).reduce((sum, sku) => sum + sku.count, 0);

    if (nextStageTotalPieces === 0) {
      continue;
    }

    // Keep the same subOrder throughout the workflow and carry forward the latest completed pieces.
    await SubOrder.findByIdAndUpdate(
      sub._id,
      {
        $set: {
          pieces: sourcePieces,
          progress: 0,
          assignedWorkers: 0
        }
      },
      { session }
    ).exec();

    let nextStageAssignment = await Assignment.findOne({
      order: orderId,
      subOrder: sub._id,
      stage: nextStage
    }).session(session);

    if (nextStageAssignment) {
      nextStageAssignment.pieces = sourcePieces;
      nextStageAssignment.totalPieces = nextStageTotalPieces;
      nextStageAssignment.requiredRole = nextStage;
      nextStageAssignment.status = nextStageAssignment.status === 'completed' ? nextStageAssignment.status : 'available';
      await nextStageAssignment.save({ session });
    } else {
      const [createdA] = await Assignment.create([{
        order: orderId,
        subOrder: sub._id,
        stage: nextStage,
        status: 'available',
        createdAt: new Date(),
        requiredRole: nextStage,
        pieces: sourcePieces,
        totalPieces: nextStageTotalPieces,
        priority: order.priority || null
      }], { session });

      nextStageAssignment = createdA;
    }

    const populated = await Assignment.findById(nextStageAssignment._id).populate('order').populate('subOrder').session(session);
    if (populated) {
      created.push({ assignment: populated, subOrder: populated.subOrder });
    }
  } // end for each ready suborder

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
      vendor,
      fabric,
      requiredKg,
      distributionMode = 'perSku',
      workersCount = 1
    } = req.body;

    if (!styleId) return res.status(400).json({ error: 'styleId required' });

    const style = await Style.findById(styleId);
    if (!style) return res.status(404).json({ error: 'Style not found' });

    const totalQuantity = computeTotalQuantity(pieces);
    const stages = getOrderStages({}, style);
    const firstStage = getFirstStage({}, style);

    if (!firstStage) {
      return res.status(400).json({ error: 'Style must have at least one stage' });
    }

    const order = new Order({
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      style: style._id,
      styleSnapshot: {
        name: style.name,
        sizes: style.sizes,
        colors: style.colors,
        steps: (style.steps || []).map((step) => ({
          stageId: step.stageId,
          label: step.label,
          price: Number(step.price) || 0
        }))
      },
      pieces,
      totalQuantity,
      stages: stages.map(normalizeStageLabel),
      requiredKg: requiredKg != null && requiredKg !== '' ? Number(requiredKg) : undefined,
      deadline,
      priority,
      vendor,
      fabric,
      createdBy: req.user?.id
    });
    await order.save();

    let created;
    if (distributionMode === 'byWorkers') {
      created = await createAssignmentsForStage(order, firstStage, Number(workersCount) || 1, { session: null });
    } else {
      created = await createAssignmentsPerSku(order, firstStage, { session: null });
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
    const { page, limit, q = '', sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const query = {};
    const sortFields = new Set(['createdAt', 'priority', 'deadline', 'totalQuantity', 'orderId']);
    const safeSortBy = sortFields.has(sortBy) ? sortBy : 'createdAt';
    const sort = { [safeSortBy]: sortDir === 'asc' ? 1 : -1 };

    if (q) {
      const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { orderId: new RegExp(escaped, 'i') },
        { vendor: new RegExp(escaped, 'i') },
        { fabric: new RegExp(escaped, 'i') }
      ];
    }

    if (page || limit) {
      const pageNumber = Math.max(1, Number(page) || 1);
      const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
      const [orders, total] = await Promise.all([
        Order.find(query).populate('style', 'name').sort(sort).skip((pageNumber - 1) * limitNumber).limit(limitNumber).lean(),
        Order.countDocuments(query)
      ]);
      return res.json({
        success: true,
        data: await enrichOrdersWithProgress(orders),
        meta: { page: pageNumber, limit: limitNumber, total, totalPages: Math.ceil(total / limitNumber) }
      });
    }

    const orders = await Order.find(query).populate('style', 'name').sort(sort).lean();
    res.json(await enrichOrdersWithProgress(orders));
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

      // Sync suborders & assignments for newly added/updated SKUs
      const firstStage = getFirstStage(order, order.style);
      if (firstStage) {
        await createAssignmentsPerSku(order, firstStage, { session: null });
      }
    }

    ['priority', 'deadline', 'vendor', 'fabric', 'requiredKg'].forEach(k => {
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
