// controllers/styleController.js
import { Style } from '../models/StyleSchema.js';

export async function getStyles(req, res) {
  try {
    const { page, limit, q = '', sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const query = {};
    const sortFields = new Set(['createdAt', 'name', 'skuId']);
    const safeSortBy = sortFields.has(sortBy) ? sortBy : 'createdAt';
    const sort = { [safeSortBy]: sortDir === 'asc' ? 1 : -1 };

    if (q) {
      const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      query.$or = [{ name: rx }, { skuId: rx }];
    }

    if (page || limit) {
      const pageNumber = Math.max(1, Number(page) || 1);
      const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
      const [styles, total] = await Promise.all([
        Style.find(query).sort(sort).skip((pageNumber - 1) * limitNumber).limit(limitNumber),
        Style.countDocuments(query)
      ]);
      return res.json({
        success: true,
        data: styles,
        meta: { page: pageNumber, limit: limitNumber, total, totalPages: Math.ceil(total / limitNumber) }
      });
    }

    const styles = await Style.find(query).sort(sort);
    res.json({ success: true, data: styles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createStyle(req, res) {
  try {
    const { name, skuId, photos = [], sizes = [], colors = [], steps = [] } = req.body;

    if (!name || !skuId) {
      return res.status(400).json({ success: false, message: 'name and skuId are required' });
    }

    // optional: enforce uniqueness of skuId handled by mongoose unique index
    const style = await Style.create({ name, skuId, photos, sizes, colors, steps });
    res.status(201).json({ success: true, data: style });
  } catch (err) {
    console.error(err);
    // duplicate key (skuId)
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'skuId already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateStyle(req, res) {
  try {
    const { id } = req.params;
    const { name, skuId, photos, sizes, colors, steps } = req.body;

    if (!name || !skuId) {
      return res.status(400).json({ success: false, message: 'name and skuId are required' });
    }

    const updated = await Style.findByIdAndUpdate(
      id,
      {
        name,
        skuId,
        photos: Array.isArray(photos) ? photos : [],
        sizes: Array.isArray(sizes) ? sizes : [],
        colors: Array.isArray(colors) ? colors : [],
        steps: Array.isArray(steps) ? steps : []
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'skuId already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteStyle(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Style.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
