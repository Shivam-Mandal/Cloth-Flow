import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function wipeDatabase() {
  console.log('🧹 Purging MongoDB database...');
  await mongoose.connect(process.env.DATABASE_URI);
  
  const { AdminModel } = await import('../models/Admin.js');
  const { WorkerModel } = await import('../models/Worker.js');
  const { Stock } = await import('../models/Stock.js');
  const { Style } = await import('../models/StyleSchema.js');
  const Order = (await import('../models/Order.js')).default;
  const SubOrder = (await import('../models/SubOrderSchema.js')).default;
  const Assignment = (await import('../models/Assignment.js')).default;
  const ApprovalHistory = (await import('../models/ApprovalHistory.js')).default;

  // Clear operational collections completely
  await WorkerModel.deleteMany({});
  await Stock.deleteMany({});
  await Style.deleteMany({});
  await Order.deleteMany({});
  await SubOrder.deleteMany({});
  await Assignment.deleteMany({});
  await ApprovalHistory.deleteMany({});

  // Ensure fresh Admin credentials exist for UI login
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  await AdminModel.updateOne(
    { email: 'admin@company.com' },
    { $set: { password: adminPasswordHash, role: 'admin', name: 'Shivam Mandal' } },
    { upsert: true }
  );

  console.log('✅ MongoDB purged! Only Admin credentials preserved for UI interaction.');
  await mongoose.disconnect();
}

wipeDatabase().catch(console.error);
