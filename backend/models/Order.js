// models/Order.js
import mongoose from 'mongoose';

const PieceSchema = new mongoose.Schema({}, { strict: false }); 
// pieces: { Red: { S: 10, M: 5 }, Blue: { S: 2 } }

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, index: true, unique: true }, // e.g. CASUALTEE-20251020-4821
  style: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', required: true },
  styleSnapshot: { // denormalized snapshot of style at order time
    name: String,
    sizes: [String],
    colors: [String],
  },
  pieces: { type: Object, default: {} }, // e.g. { Red: { S: 2, M: 0 }, Blue: { S: 1 } }
  totalQuantity: { type: Number, default: 0 },
  requiredKg: { type: Number }, // optional business field
  currentStage: { type: String, default: 'Created' }, // e.g. Created, Cutting, Stitching
  progress: { type: Number, default: 0 }, // 0-100
  assignedWorkers: { type: Number, default: 0 },
  priority: { type: String, enum: ['Low','Normal','High'], default: 'Normal' },
  deadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin' }, // optional
}, {
  timestamps: true
});

// create compound index if you like
OrderSchema.index({ orderId: 1 });

export const Order = mongoose.model('Order', OrderSchema);
export default Order;
