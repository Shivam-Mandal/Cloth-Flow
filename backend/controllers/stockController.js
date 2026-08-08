// controllers/stockController.js
import { Stock } from '../models/Stock.js';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STOCK_SORT_FIELDS = new Set(['vendor', 'quantityKg', 'unitPrice', 'sizeMm', 'fabric', 'dateAdded', 'createdAt', 'updatedAt']);

/**
 * GET /api/stocks
 * Query params (optional):
 *  - q: general search string (matches vendor, color.name, or fabric)
 *  - vendor: filter by vendor exact or partial
 *  - color: filter by color name
 *  - page, limit: pagination
 *  - sortBy: field to sort, default dateAdded
 *  - sortDir: asc|desc
 *
 * Returns: { success, data: [stocks], meta: { totalStockKg, totalValue, itemCount, page, limit } }
 */
export const getAllStocks = async (req, res) => {
  try {
    const {
      q,
      vendor,
      color,
      page = 1,
      limit = 20,
      sortBy = 'dateAdded',
      sortDir = 'desc'
    } = req.query;

    const query = {};

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      query.$or = [
        { vendor: rx },
        { 'color.name': rx },
        { fabric: rx }
      ];
    }

    if (vendor) query.vendor = new RegExp(escapeRegex(vendor), 'i');
    if (color) query['color.name'] = new RegExp(escapeRegex(color), 'i');

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;
    const safeSortBy = STOCK_SORT_FIELDS.has(sortBy) ? sortBy : 'dateAdded';

    const stocks = await Stock.find(query)
      .sort({ [safeSortBy]: sortDir === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNumber);

    // aggregate totals for the current filtered set (not just page)
    const agg = await Stock.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalKg: { $sum: '$quantityKg' },
          totalValue: { $sum: { $multiply: ['$quantityKg', '$unitPrice'] } },
          count: { $sum: 1 }
        }
      }
    ]);

    const meta = {
      totalStockKg: agg[0]?.totalKg || 0,
      totalValue: agg[0]?.totalValue || 0,
      itemCount: agg[0]?.count || 0,
      page: pageNumber,
      limit: limitNumber
    };

    return res.json({ success: true, data: stocks, meta });
  } catch (err) {
    console.error('getAllStocks err:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/stocks/:id
 */
export const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });
    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('getStockById err:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/stocks
 * Body:
 * {
 *   vendor: "Textile Corp",
 *   color: { name: "Red", hex: "#ff0000" },
 *   fabric: "Cotton",
 *   image: "https://res.cloudinary.com/...",
 *   quantityKg: 120,
 *   unitPrice: 25,
 *   sizeMm: 20
 * }
 */
export const createStock = async (req, res) => {
  try {
    const { vendor, color, quantityKg, unitPrice, sizeMm, fabric, image } = req.body;
    if (!vendor || !color || !color.name || quantityKg == null || unitPrice == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newStock = new Stock({
      vendor,
      color: {
        name: color.name,
        hex: color.hex || null
      },
      fabric: fabric ? String(fabric).trim() : '',
      image: image ? String(image).trim() : '',
      quantityKg: Number(quantityKg),
      unitPrice: Number(unitPrice),
      sizeMm: sizeMm != null ? Number(sizeMm) : null
    });

    await newStock.save();
    return res.status(201).json({ success: true, data: newStock });
  } catch (err) {
    console.error('createStock err:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/stocks/:id
 * Replace provided fields for a stock record (name/quantity/price/etc)
 */
export const updateStock = async (req, res) => {
  try {
    const { vendor, color, quantityKg, unitPrice, sizeMm, fabric, image } = req.body;

    const update = {};
    if (vendor !== undefined) update.vendor = vendor;
    if (color !== undefined) update.color = {
      name: color.name ?? (color?.name || ''),
      hex: color.hex ?? (color?.hex || null)
    };
    if (fabric !== undefined) update.fabric = String(fabric).trim();
    if (image !== undefined) update.image = String(image).trim();
    if (quantityKg !== undefined) update.quantityKg = Number(quantityKg);
    if (unitPrice !== undefined) update.unitPrice = Number(unitPrice);
    if (sizeMm !== undefined) update.sizeMm = sizeMm === null ? null : Number(sizeMm);

    const stock = await Stock.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });
    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('updateStock err:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/stocks/:id
 */
export const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findByIdAndDelete(req.params.id);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });
    return res.json({ success: true, message: 'Stock deleted' });
  } catch (err) {
    console.error('deleteStock err:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/stocks/vendors
 * Get unique vendors from stock
 */
export const getVendors = async (req, res) => {
  try {
    const vendors = await Stock.distinct('vendor');
    return res.json({ success: true, data: vendors });
  } catch (err) {
    console.error('getVendors err:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
