import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, index: true, unique: true },
  style: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', required: true },
  styleSnapshot: {
    name: String,
    sizes: [String],
    colors: [String],
    steps: [{
      stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage' },
      label: String,
      price: { type: Number, default: 0 }
    }]
  },
  pieces: { type: Object, default: {} },
  totalQuantity: { type: Number, default: 0 },
  requiredKg: { type: Number },
  vendor: { type: String, trim: true },
  fabric: { type: String, trim: true },
  stages: { type: [String], default: [] },
  priority: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' },
  deadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, {
  timestamps: true
});

export const Order = mongoose.model('Order', OrderSchema);
export default Order;
