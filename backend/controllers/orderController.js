import { Order } from '../models/Order.js';
import { Style } from '../models/StyleSchema.js';

/**
 * Helper to sum nested pieces object
 * pieces = { Red: { S: 2, M: 4 }, Blue: { S: 1 } }
 */
const computeTotalQuantity = (pieces = {}) => {
  let total = 0;
  for (const color of Object.keys(pieces)) {
    const sizes = pieces[color] || {};
    for (const size of Object.keys(sizes)) {
      const val = Number(sizes[size]) || 0;
      total += val;
    }
  }
  return total;
};

// Generate random alphanumeric string of given length
const generateRandomCode = (length = 4) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createOrder = async (req, res) => {
  try {
    const { styleId, pieces = {}, deadline, priority, requiredKg } = req.body;
    if (!styleId) return res.status(400).json({ error: 'styleId required' });

    const style = await Style.findById(styleId);
    if (!style) return res.status(404).json({ error: 'Style not found' });

    // Validate pieces against style colors & sizes
    for (const color of Object.keys(pieces)) {
      if (!style.colors.includes(color)) {
        return res.status(400).json({ error: `Invalid color ${color}` });
      }
      const sizesObj = pieces[color];
      for (const size of Object.keys(sizesObj)) {
        if (!style.sizes.includes(size)) {
          return res.status(400).json({ error: `Invalid size ${size} for color ${color}` });
        }
        if (isNaN(Number(sizesObj[size])) || Number(sizesObj[size]) < 0) {
          return res.status(400).json({ error: `Invalid quantity for ${color} ${size}` });
        }
      }
    }

    const totalQuantity = computeTotalQuantity(pieces);

    // Generate unique orderId
    let orderId;
    let isUnique = false;
    while (!isUnique) {
      const styleCode = style.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomCode = generateRandomCode(4);
      orderId = `${styleCode}${dateCode}${randomCode}`;

      const existing = await Order.findOne({ orderId });
      if (!existing) isUnique = true; // unique
    }

    const order = new Order({
      orderId,
      style: style._id,
      styleSnapshot: { name: style.name, sizes: style.sizes, colors: style.colors },
      pieces,
      totalQuantity,
      deadline,
      requiredKg,
      priority,
      createdBy: req.user?.id
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('style', 'name').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('style', 'name sizes colors');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error(err);
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
    ['progress', 'currentStage', 'assignedWorkers', 'priority', 'deadline'].forEach(k => {
      if (up[k] !== undefined) order[k] = up[k];
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
