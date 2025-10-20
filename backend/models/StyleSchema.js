// models/Style.js
import mongoose from 'mongoose';

const StepSchema = new mongoose.Schema({
  label: { type: String, required: true },
  price: { type: Number, default: 0 }
}, { _id: false });

const StyleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  skuId: { type: String, required: true, unique: true },
  photos: [{ type: String }], // Cloudinary URLs
  sizes: [{ type: String }],  // flexible sizes
  colors: [{ type: String }],
  steps: { type: [StepSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export const Style = mongoose.model('Style', StyleSchema);
