import dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true })
import mongoose from "mongoose";
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
  } catch (error) {
    console.error("MongoDB connection error:", error);

    process.exit(1);
  }
};

export default connectDB;
