import Stage from '../models/Stage.js';
import { Style } from '../models/StyleSchema.js';
import { normalizeStageLabel } from '../utils/workflow.js';

const defaultStages = ['Cutting', 'Printing', 'Stitching', 'Finishing', 'Packing'];

const seedDefaultStages = async () => {
  const count = await Stage.countDocuments();
  if (count > 0) return;

  await Stage.insertMany(
    defaultStages.map((name, index) => ({
      name,
      sortOrder: index + 1,
      active: true
    }))
  );
};

export const getStages = async (_req, res) => {
  try {
    await seedDefaultStages();
    const stages = await Stage.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return res.json({ success: true, data: stages });
  } catch (error) {
    console.error('getStages error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch stages' });
  }
};

export const createStage = async (req, res) => {
  try {
    await seedDefaultStages();

    const name = normalizeStageLabel(req.body?.name);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Stage name is required' });
    }

    const existing = await Stage.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();
    if (existing) {
      return res.status(409).json({ success: false, message: 'Stage already exists' });
    }

    const maxStage = await Stage.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    const stage = await Stage.create({
      name,
      sortOrder: (Number(maxStage?.sortOrder) || 0) + 1,
      active: true
    });

    return res.status(201).json({ success: true, data: stage });
  } catch (error) {
    console.error('createStage error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create stage' });
  }
};

export const updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    if (req.body?.name !== undefined) {
      const name = normalizeStageLabel(req.body.name);
      if (!name) return res.status(400).json({ success: false, message: 'Stage name is required' });
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const duplicate = await Stage.findOne({
        _id: { $ne: id },
        name: new RegExp(`^${escapedName}$`, 'i')
      }).select('_id').lean();
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Stage already exists' });
      }
      updates.name = name;
    }

    if (req.body?.active !== undefined) updates.active = Boolean(req.body.active);
    if (req.body?.sortOrder !== undefined) updates.sortOrder = Number(req.body.sortOrder) || 0;

    const stage = await Stage.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!stage) return res.status(404).json({ success: false, message: 'Stage not found' });

    return res.json({ success: true, data: stage });
  } catch (error) {
    console.error('updateStage error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Stage already exists' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to update stage' });
  }
};

export const deleteStage = async (req, res) => {
  try {
    const { id } = req.params;

    const stage = await Stage.findById(id).lean();
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }

    const usedByStyle = await Style.exists({ 'steps.stageId': id });
    if (usedByStyle) {
      return res.status(409).json({
        success: false,
        message: 'Stage is used by existing styles. Disable it instead of deleting.'
      });
    }

    await Stage.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Stage deleted successfully' });
  } catch (error) {
    console.error('deleteStage error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete stage' });
  }
};
