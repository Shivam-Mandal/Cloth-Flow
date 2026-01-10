import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, index: true, unique: true },
  style: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', required: true },
  styleSnapshot: {
    name: String,
    sizes: [String],
    colors: [String],
  },
  pieces: { type: Object, default: {} },
  totalQuantity: { type: Number, default: 0 },
  requiredKg: { type: Number },
  vendor: { type: String, trim: true },
  stages: { type: [String], default: ['Cutting', 'Printing', 'Stitching', 'Finishing', 'Packing', 'Sale out'] },
  priority: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' },
  deadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin' },
}, {
  timestamps: true
});

export const Order = mongoose.model('Order', OrderSchema);
export default Order;
