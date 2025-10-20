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
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const WorkerModel = mongoose.model("Worker", workerSchema);
