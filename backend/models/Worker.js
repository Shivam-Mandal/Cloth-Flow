import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    dob: { type: Date },
    address: { type: String },
    profileImageUrl: { type: String },
    role: { type: String, enum: ["worker"], default: "worker" },
    workerType: { 
      type: String, 
      trim: true,
      required: function() { return this.role === "worker"; } 
    },
    allowMultipleClaims: { type: Boolean, default: false },
    autoApprove: { type: Boolean, default: false },
    allowExcessPieces: { type: Boolean, default: false },
    lastLogin: { type: Date },

}, { timestamps: true });

export const WorkerModel = mongoose.model("Worker", workerSchema);
