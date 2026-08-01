import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ApprovalHistory from '../models/ApprovalHistory.js';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });

const run = async () => {
  if (!process.env.DATABASE_URI) {
    throw new Error('DATABASE_URI is required');
  }

  await mongoose.connect(process.env.DATABASE_URI);

  const adminResult = await ApprovalHistory.updateMany(
    { actorRole: 'admin', $or: [{ actorModel: { $exists: false } }, { actorModel: null }] },
    { $set: { actorModel: 'Admin' } }
  );

  const workerResult = await ApprovalHistory.updateMany(
    { actorRole: 'worker', $or: [{ actorModel: { $exists: false } }, { actorModel: null }] },
    { $set: { actorModel: 'Worker' } }
  );

  console.log('ApprovalHistory actorModel backfill complete', {
    adminMatched: adminResult.matchedCount,
    adminModified: adminResult.modifiedCount,
    workerMatched: workerResult.matchedCount,
    workerModified: workerResult.modifiedCount
  });

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('ApprovalHistory actorModel backfill failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
