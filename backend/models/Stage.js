import mongoose from 'mongoose';

const StageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Stage = mongoose.model('Stage', StageSchema);
export default Stage;
