import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    profileImageUrl: { type: String },
    role: { type: String, enum: ["admin"], default: "admin" },
    refreshToken: { type: String },
},{ timestamps: true});

export const AdminModel = mongoose.model("Admin", adminSchema);
