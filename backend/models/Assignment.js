// models/Assignment.js
import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  subOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'SubOrder' }, // <-- added
  stage: { type: String, required: true }, // "Cutting", "Stitching", ...
  requiredRole: { type: String, default: '' },
  priority: { type: String, enum: ['Low', 'Normal', 'High', null], default: null },
  category: { type: String, default: '' },
  pieces: { type: Object, default: {} }, // { Red: { S: 10, M: 0 }, Blue: { S: 2 } }
  totalPieces: { type: Number, default: 0 },
  status: { type: String, enum: ['available','assigned','in_progress','completed'], default: 'available' },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }, // ensure this matches your Worker model name
  assignedAt: Date,
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },
  completedPieces: { type: Number, default: 0 },
  damagedPieces: { type: Number, default: 0 },
  damagedReason: { type: String, default: '' },
}, { timestamps: true });

AssignmentSchema.index({ worker: 1, status: 1 });
AssignmentSchema.index({ order: 1, subOrder: 1, stage: 1 });
AssignmentSchema.index({ status: 1, stage: 1, createdAt: 1 });

export const Assignment = mongoose.model('Assignment', AssignmentSchema);
export default Assignment;
