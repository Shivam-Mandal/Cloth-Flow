// models/Stock.js
import mongoose from 'mongoose';

const StockSchema = new mongoose.Schema({
  vendor: { type: String, required: true, trim: true },
  color: {
    name: { type: String, required: true, trim: true }, // e.g. "Navy Blue"
    hex: { type: String, trim: true }                   // optional hex code e.g. "#003366"
  },
  quantityKg: { type: Number, required: true, min: 0 }, // quantity in kg
  unitPrice: { type: Number, required: true, min: 0 },  // price per kg (or unit) in store currency
  sizeMm: { type: Number, default: null },              // optional size in mm
  dateAdded: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// virtual totalValue = quantityKg * unitPrice
StockSchema.virtual('totalValue').get(function () {
  return (this.quantityKg || 0) * (this.unitPrice || 0);
});

export const Stock = mongoose.model('Stock', StockSchema);
