// controllers/styleController.js
import { Style } from '../models/StyleSchema.js';

export async function getStyles(req, res) {
  try {
    const styles = await Style.find().sort({ createdAt: -1 });
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
