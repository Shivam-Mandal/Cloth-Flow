import mongoose from 'mongoose';

const SubOrderSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderId: { type: String, index: true },
  subOrderCode: { type: String, index: true, unique: true, sparse: true },
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
  submittedPieces: {
    type: Number,
    default: 0
  },
  approvedPieces: {
    type: Number,
    default: 0
  },
  faultyPieces: {
    type: Number,
    default: 0
  },
  pricePerPiece: {
    type: Number,
    default: 0   // set from style management
  },
  workerEarnings: {
    type: Number,
    default: 0  // calculated after approval
  },
  inventoryStatus: {
    type: String,
    enum: ['not_ready', 'packed', 'ready_for_sale', 'reserved', 'dispatched', 'sold'],
    default: 'not_ready'
  },
  inventorySourceStage: {
    type: String,
    default: ''
  },
  inventoryLocation: {
    type: String,
    default: ''
  },
  inventoryNotes: {
    type: String,
    default: ''
  },
  saleReference: {
    type: String,
    default: ''
  },
  inventoryUpdatedAt: {
    type: Date,
    default: null
  },
  inventoryUpdatedByName: {
    type: String,
    default: ''
  },
  inventoryUpdatedByRole: {
    type: String,
    default: ''
  },
  inventoryEvents: {
    type: [{
      status: { type: String, default: '' },
      location: { type: String, default: '' },
      notes: { type: String, default: '' },
      saleReference: { type: String, default: '' },
      updatedAt: { type: Date, default: Date.now },
      updatedByName: { type: String, default: '' },
      updatedByRole: { type: String, default: '' }
    }],
    default: []
  }
}, {
  timestamps: true
});

const generateSubOrderCode = () => {
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SO-${time}${rand}`;
};

SubOrderSchema.pre('save', function (next) {
  if (!this.subOrderCode) {
    this.subOrderCode = generateSubOrderCode();
  }
  next();
});

SubOrderSchema.index({ order: 1, orderId: 1 });

export const SubOrder = mongoose.model('SubOrder', SubOrderSchema);
export default SubOrder;
