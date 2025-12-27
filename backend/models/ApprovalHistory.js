// models/ApprovalHistory.js
import mongoose from 'mongoose';

const ApprovalHistorySchema = new mongoose.Schema({
  subOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'SubOrder', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  action: {
    type: String,
    enum: ['submitted', 'approved', 'rejected'],
    required: true
  },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true }, // Worker who submitted or Admin who approved/rejected
  actorRole: { type: String, enum: ['worker', 'admin'], required: true },
  amount: { type: Number, default: 0 }, // Payment amount for approved actions
  reason: { type: String, default: '' }, // Reason for rejection
  previousStatus: { type: String },
  newStatus: { type: String, required: true },
  notes: { type: String, default: '' },
  metadata: {
    subOrderName: String,
    orderId: String,
    stage: String,
    progress: Number
  }
}, {
  timestamps: true
});

ApprovalHistorySchema.index({ subOrder: 1, createdAt: -1 });
ApprovalHistorySchema.index({ actor: 1, createdAt: -1 });
ApprovalHistorySchema.index({ action: 1, createdAt: -1 });

export const ApprovalHistory = mongoose.model('ApprovalHistory', ApprovalHistorySchema);
export default ApprovalHistory;