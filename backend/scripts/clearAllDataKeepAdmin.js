import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function clearDataKeepAdmin() {
  console.log('🧹 Connecting to MongoDB...');
  await mongoose.connect(process.env.DATABASE_URI);

  const { AdminModel } = await import('../models/Admin.js');
  const { WorkerModel } = await import('../models/Worker.js');
  const { Stock } = await import('../models/Stock.js');
  const { Style } = await import('../models/StyleSchema.js');
  const Stage = (await import('../models/Stage.js')).default;
  const Order = (await import('../models/Order.js')).default;
  const SubOrder = (await import('../models/SubOrderSchema.js')).default;
  const Assignment = (await import('../models/Assignment.js')).default;
  const ApprovalHistory = (await import('../models/ApprovalHistory.js')).default;

  console.log('🗑️ Purging all collections in MongoDB...');
  await Promise.all([
    AdminModel.deleteMany({}),
    WorkerModel.deleteMany({}),
    Stock.deleteMany({}),
    Style.deleteMany({}),
    Stage.deleteMany({}),
    Order.deleteMany({}),
    SubOrder.deleteMany({}),
    Assignment.deleteMany({}),
    ApprovalHistory.deleteMany({})
  ]);

  console.log('🔑 Creating Admin credential: admin@gmail.com / admin123 ...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  
  const newAdmin = new AdminModel({
    name: 'Admin User',
    email: 'admin@gmail.com',
    password: adminPasswordHash,
    role: 'admin'
  });

  await newAdmin.save();

  console.log('✅ Success! Database wiped completely.');
  console.log('Admin account created:');
  console.log(' - Email: admin@gmail.com');
  console.log(' - Password: admin123');

  // Verify counts
  const adminCount = await AdminModel.countDocuments();
  const workerCount = await WorkerModel.countDocuments();
  const orderCount = await Order.countDocuments();
  const stockCount = await Stock.countDocuments();
  const styleCount = await Style.countDocuments();

  console.log('\n📊 Database Status Verification:');
  console.log(` - Admin accounts: ${adminCount}`);
  console.log(` - Worker accounts: ${workerCount}`);
  console.log(` - Orders: ${orderCount}`);
  console.log(` - Stocks: ${stockCount}`);
  console.log(` - Styles: ${styleCount}`);

  await mongoose.disconnect();
}

clearDataKeepAdmin().catch((err) => {
  console.error('❌ Error clearing database:', err);
  process.exit(1);
});
