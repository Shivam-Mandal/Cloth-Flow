import mongoose from 'mongoose';

const SubOrderSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderId: { type: String, index: true },
  name: { type: String, required: true, default: 'Batch' },
  pieces: { type: Object, default: {} },
  currentStage: { type: String, default: 'Created' },
  progress: { type: Number, default: 0 },
  assignedWorkers: { type: Number, default: 0 },
  priority: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' },
  requiredKg: { type: Number },
  status: { type: String, enum: ['pending', 'in_progress', 'pending_approval', 'approved', 'completed'], default: 'pending' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },
  amount: { type: Number, default: 0 },
}, {
  timestamps: true
});

SubOrderSchema.index({ order: 1, orderId: 1 });

export const SubOrder = mongoose.model('SubOrder', SubOrderSchema);
export default SubOrder;
