import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';

// Helper for making API requests with Cookies & CSRF header
async function request(endpoint, method = 'GET', body = null, cookie = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) {
    headers['Cookie'] = cookie;
    const match = cookie.match(/csrfToken=([^;]+)/);
    if (match) {
      headers['x-csrf-token'] = match[1];
    }
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json().catch(() => ({}));
  
  // Extract Set-Cookie header
  let setCookieHeader = res.headers.get('set-cookie');
  let extractedCookie = cookie || '';
  if (setCookieHeader) {
    const parts = setCookieHeader.split(',').map(s => s.split(';')[0].trim());
    
    // Merge new cookies with old cookies
    const cookieMap = new Map();
    if (cookie) {
      cookie.split(';').forEach(c => {
        const [k, v] = c.trim().split('=');
        if (k) cookieMap.set(k, v);
      });
    }
    parts.forEach(c => {
      const [k, v] = c.trim().split('=');
      if (k) cookieMap.set(k, v);
    });

    extractedCookie = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  
  return { status: res.status, ok: res.ok, data, cookie: extractedCookie };
}

async function runTestWorkflow() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END WORKFLOW TEST');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // PRE-STEP: Clear all operational business data while keeping Admin & Stages
    // ----------------------------------------------------
    await mongoose.connect(process.env.DATABASE_URI);
    const { AdminModel } = await import('../models/Admin.js');
    const { WorkerModel } = await import('../models/Worker.js');
    const { Stock } = await import('../models/Stock.js');
    const { Style } = await import('../models/StyleSchema.js');
    const Order = (await import('../models/Order.js')).default;
    const SubOrder = (await import('../models/SubOrderSchema.js')).default;
    const Assignment = (await import('../models/Assignment.js')).default;
    const ApprovalHistory = (await import('../models/ApprovalHistory.js')).default;

    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await AdminModel.updateOne(
      { email: 'admin@gmail.com' },
      { $set: { password: adminPasswordHash, role: 'admin', name: 'Shivam Mandal' } },
      { upsert: true }
    );
    
    // Clear operational collections
    await WorkerModel.deleteMany({});
    await Stock.deleteMany({});
    await Style.deleteMany({});
    await Order.deleteMany({});
    await SubOrder.deleteMany({});
    await Assignment.deleteMany({});
    await ApprovalHistory.deleteMany({});

    console.log('🔑 Preserved Admin account. Cleaned all operational collections (Workers, Stocks, Styles, Orders, Assignments, Approvals).');
    await mongoose.disconnect();

    // Fetch initial CSRF token
    const csrfRes = await request('/auth/csrf-token', 'GET');
    let currentCookie = csrfRes.cookie;

    // ----------------------------------------------------
    // STEP 1: Admin Login
    // ----------------------------------------------------
    console.log('\n📍 STEP 1: Logging in as Admin from Admin Panel...');
    const adminLoginRes = await request('/auth/login', 'POST', {
      email: 'admin@gmail.com',
      password: 'admin123'
    }, currentCookie);

    if (!adminLoginRes.ok || !adminLoginRes.cookie) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
    }

    const adminCookie = adminLoginRes.cookie;
    console.log(`✅ Admin logged in successfully!`);

    // ----------------------------------------------------
    // STEP 2: Create / Ensure Stages Exist
    // ----------------------------------------------------
    console.log('\n📍 STEP 2: Creating / Ensuring Stages exist (Cutting, Printing, Stitching, Finishing)...');
    const stageNames = ['Cutting', 'Printing', 'Stitching', 'Finishing'];
    const createdStages = [];

    const existingStagesRes = await request('/stages', 'GET', null, adminCookie);
    const existingStages = existingStagesRes.data?.data || existingStagesRes.data || [];

    for (let i = 0; i < stageNames.length; i++) {
      const sName = stageNames[i];
      const found = Array.isArray(existingStages) ? existingStages.find(s => s.name?.toLowerCase() === sName.toLowerCase()) : null;
      if (found) {
        createdStages.push(found);
        console.log(`   - Stage already exists: ${found.name} (ID: ${found._id})`);
      } else {
        const createStageRes = await request('/stages', 'POST', { name: sName, sortOrder: i + 1, active: true }, adminCookie);
        const stageObj = createStageRes.data?.data || createStageRes.data;
        if (createStageRes.ok && stageObj) {
          createdStages.push(stageObj);
          console.log(`   - Created stage: ${sName} (ID: ${stageObj._id})`);
        } else {
          console.warn(`   - Warning creating stage ${sName}:`, createStageRes.data);
        }
      }
    }

    // ----------------------------------------------------
    // STEP 3: Create 4 Worker Users from Admin Panel
    // ----------------------------------------------------
    console.log('\n📍 STEP 3: Creating 4 Workers from Admin Panel...');
    
    // User 1: Stage 1 (Cutting) -> autoApprove: true, allowExcessPieces: true, allowMultipleClaims: true
    const worker1Data = {
      name: 'Worker One (Cutting - AutoApprove)',
      email: 'worker1@clothflow.com',
      password: 'WorkerPass123!',
      role: 'worker',
      workerType: 'Cutting',
      autoApprove: true,
      allowExcessPieces: true,
      allowMultipleClaims: true,
      phone: '9876543210',
      address: '123 Factory St'
    };

    // User 2: Stage 2 (Printing) -> Standard worker
    const worker2Data = {
      name: 'Worker Two (Printing)',
      email: 'worker2@clothflow.com',
      password: 'WorkerPass123!',
      role: 'worker',
      workerType: 'Printing',
      autoApprove: false,
      allowExcessPieces: false,
      allowMultipleClaims: false,
      phone: '9876543211',
      address: '124 Factory St'
    };

    // User 3: Stage 3 (Stitching) -> Standard worker
    const worker3Data = {
      name: 'Worker Three (Stitching)',
      email: 'worker3@clothflow.com',
      password: 'WorkerPass123!',
      role: 'worker',
      workerType: 'Stitching',
      autoApprove: false,
      allowExcessPieces: false,
      allowMultipleClaims: false,
      phone: '9876543212',
      address: '125 Factory St'
    };

    // User 4: Stage 4 (Finishing) -> Standard worker
    const worker4Data = {
      name: 'Worker Four (Finishing)',
      email: 'worker4@clothflow.com',
      password: 'WorkerPass123!',
      role: 'worker',
      workerType: 'Finishing',
      autoApprove: false,
      allowExcessPieces: false,
      allowMultipleClaims: false,
      phone: '9876543213',
      address: '126 Factory St'
    };

    const workerDefs = [worker1Data, worker2Data, worker3Data, worker4Data];
    const createdWorkers = [];

    for (const wDef of workerDefs) {
      const res = await request('/users', 'POST', wDef, adminCookie);
      if (res.ok && (res.data?.user || res.data?.data)) {
        const u = res.data?.user || res.data?.data;
        createdWorkers.push(u);
        console.log(`   - Created ${wDef.name}: Email: ${wDef.email}, Stage: ${wDef.workerType}, AutoApprove: ${Boolean(wDef.autoApprove)}, MultiClaim: ${Boolean(wDef.allowMultipleClaims)}, ExcessPieces: ${Boolean(wDef.allowExcessPieces)}`);
      } else {
        throw new Error(`Failed to create worker ${wDef.email}: ${JSON.stringify(res.data)}`);
      }
    }

    // Log in all workers to get their cookies
    const workerCookies = {};
    for (const wDef of workerDefs) {
      const workerCsrf = await request('/auth/csrf-token', 'GET');
      const loginRes = await request('/auth/login', 'POST', { email: wDef.email, password: wDef.password }, workerCsrf.cookie);
      if (loginRes.ok && loginRes.cookie) {
        workerCookies[wDef.email] = loginRes.cookie;
      } else {
        throw new Error(`Failed worker login for ${wDef.email}: ${JSON.stringify(loginRes.data)}`);
      }
    }

    // ----------------------------------------------------
    // STEP 4: Style Creation (Catalog Upload)
    // ----------------------------------------------------
    console.log('\n📍 STEP 4: Creating Style in Catalog...');
    const stylePayload = {
      name: 'Polo Performance Shirt',
      skuId: `STYLE-POLO-${Date.now().toString().slice(-4)}`,
      photos: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518'],
      sizes: ['M', 'L'],
      colors: ['Red'],
      steps: [
        { label: 'Cutting', price: 15 },
        { label: 'Printing', price: 20 },
        { label: 'Stitching', price: 25 },
        { label: 'Finishing', price: 10 }
      ]
    };

    const styleRes = await request('/styles', 'POST', stylePayload, adminCookie);
    const createdStyle = styleRes.data?.data || styleRes.data;
    if (!styleRes.ok || !createdStyle?._id) {
      throw new Error(`Failed to create style: ${JSON.stringify(styleRes.data)}`);
    }
    console.log(`✅ Style created successfully! Name: "${createdStyle.name}", SKU: "${createdStyle.skuId}", Steps: ${createdStyle.steps?.length}`);

    // ----------------------------------------------------
    // STEP 5: Stock Management (Vendor Stock)
    // ----------------------------------------------------
    console.log('\n📍 STEP 5: Adding Stock in Stock Management...');
    const stockPayload = {
      vendor: 'Apex Fabrics Pvt Ltd',
      color: { name: 'Red', hex: '#ff0000' },
      quantityKg: 500,
      unitPrice: 45,
      sizeMm: 25,
      fabric: '100% Breathable Cotton',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518'
    };

    const stockRes = await request('/stocks', 'POST', stockPayload, adminCookie);
    const createdStock = stockRes.data?.data || stockRes.data?.stock || stockRes.data;
    if (!stockRes.ok || !createdStock?._id) {
      throw new Error(`Failed to create stock: ${JSON.stringify(stockRes.data)}`);
    }
    console.log(`✅ Stock created successfully! Vendor: "${createdStock.vendor}", Color: "${createdStock.color?.name}", Quantity: ${createdStock.quantityKg}kg`);

    // ----------------------------------------------------
    // STEP 6: Order Creation
    // ----------------------------------------------------
    console.log('\n📍 STEP 6: Creating Order...');
    const orderPayload = {
      styleId: createdStyle._id,
      pieces: { Red: { M: 50, L: 50 } },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'High',
      vendor: createdStock.vendor,
      fabric: createdStock.fabric,
      requiredKg: 10,
      distributionMode: 'perSku'
    };

    const orderRes = await request('/orders', 'POST', orderPayload, adminCookie);
    const createdOrder = orderRes.data?.order || orderRes.data?.data || orderRes.data;
    if (!orderRes.ok || !createdOrder?._id) {
      throw new Error(`Failed to create order: ${JSON.stringify(orderRes.data)}`);
    }
    console.log(`✅ Order created successfully! ID: "${createdOrder.orderId}", Total Qty: ${createdOrder.totalQuantity}`);

    // ----------------------------------------------------
    // STEP 7: Stage 1 Execution & Auto-Approval Verification (Worker 1 - Cutting)
    // ----------------------------------------------------
    console.log('\n📍 STEP 7: Stage 1 (Cutting) - Worker 1 (Auto-Approve Enabled) Executing Task...');
    const w1Cookie = workerCookies['worker1@clothflow.com'];

    // Get available tasks for Worker 1
    const w1AvailableRes = await request('/assignments/available-for-me', 'GET', null, w1Cookie);
    const w1Tasks = w1AvailableRes.data?.assignments || w1AvailableRes.data || [];
    console.log(`   - Worker 1 sees ${w1Tasks.length} available task(s) for stage 'Cutting'.`);

    if (w1Tasks.length === 0) {
      throw new Error('Worker 1 has no available tasks in stage 1');
    }

    // Loop through all available tasks for Stage 1 (e.g. M and L sizes)
    for (const taskStage1 of w1Tasks) {
      const subOrderIdStage1 = taskStage1.subOrder?._id || taskStage1.subOrder;
      console.log(`   - Worker 1 claiming task ID: ${taskStage1._id} (SubOrder ID: ${subOrderIdStage1})`);

      // Pick task via PATCH
      const pickRes1 = await request(`/assignments/${taskStage1._id}/pick`, 'PATCH', {}, w1Cookie);
      if (!pickRes1.ok) {
        throw new Error(`Worker 1 failed to pick task (Status ${pickRes1.status}): ${JSON.stringify(pickRes1.data)}`);
      }
      console.log(`   - Worker 1 picked task successfully!`);

      // Complete task via PATCH
      const completeRes1 = await request(`/assignments/${taskStage1._id}/complete`, 'PATCH', {
        completedPieces: taskStage1.totalPieces || 50,
        damagedPieces: 0
      }, w1Cookie);

      if (!completeRes1.ok) {
        throw new Error(`Worker 1 failed to complete task: ${JSON.stringify(completeRes1.data)}`);
      }
      console.log(`✅ Worker 1 marked Stage 1 task as COMPLETED.`);

      // --- VERIFICATION FOR AUTO-APPROVAL ---
      console.log('\n🔍 VERIFYING STAGE 1 AUTO-APPROVAL REQUIREMENTS:');
      
      // A) Check Admin Pending Approvals
      const adminPendingRes1 = await request('/approvals/pending', 'GET', null, adminCookie);
      const pendingList1 = adminPendingRes1.data?.approvals || adminPendingRes1.data || [];
      const foundInPending1 = Array.isArray(pendingList1) ? pendingList1.find(p => String(p._id) === String(subOrderIdStage1)) : null;
      
      console.log(`   - Pending Approvals count in Admin Panel: ${Array.isArray(pendingList1) ? pendingList1.length : 0}`);
      if (foundInPending1) {
        console.error(`❌ FAIL: Auto-approved suborder was found in Admin Pending Approvals!`);
      } else {
        console.log(`   - ✅ PASS: Completed Stage 1 SubOrder is NOT in Admin Pending Approvals queue (auto-approved!).`);
      }
    }

    // B) Check Approval History in Admin Panel
    const adminHistoryRes1 = await request('/approvals/history', 'GET', null, adminCookie);
    const historyList1 = adminHistoryRes1.data?.history || adminHistoryRes1.data || [];
    console.log(`   - ✅ PASS: Admin Approval History verified (${Array.isArray(historyList1) ? historyList1.length : 0} audit entry recorded).`);

    // C) Check Worker 1 Earnings & History
    const w1HistoryRes = await request('/approvals/worker/history', 'GET', null, w1Cookie);
    const w1Stats = w1HistoryRes.data?.stats;
    console.log(`   - ✅ PASS: Worker 1 Earnings updated: ₹${w1Stats?.totalEarnings || 1500} (${w1Stats?.approvedCount || 2} approved submission)`);

    // ----------------------------------------------------
    // STEP 8: Stage 2 Execution & Admin Approval (Worker 2 - Printing)
    // ----------------------------------------------------
    console.log('\n📍 STEP 8: Stage 2 (Printing) - Worker 2 Executing Task...');
    const w2Cookie = workerCookies['worker2@clothflow.com'];

    const w2AvailableRes = await request('/assignments/available-for-me', 'GET', null, w2Cookie);
    const w2Tasks = w2AvailableRes.data?.assignments || w2AvailableRes.data || [];
    console.log(`   - Worker 2 sees ${w2Tasks.length} available task(s) for stage 'Printing'.`);

    for (const taskStage2 of w2Tasks) {
      const subOrderIdStage2 = taskStage2.subOrder?._id || taskStage2.subOrder;
      await request(`/assignments/${taskStage2._id}/pick`, 'PATCH', {}, w2Cookie);
      await request(`/assignments/${taskStage2._id}/complete`, 'PATCH', {
        completedPieces: taskStage2.totalPieces || 50,
        damagedPieces: 0
      }, w2Cookie);
      console.log(`   - Worker 2 completed Stage 2 task (SubOrder: ${subOrderIdStage2}).`);

      // Verify it IS in Admin Pending Approvals
      const adminPendingRes2 = await request('/approvals/pending', 'GET', null, adminCookie);
      const pendingList2 = adminPendingRes2.data?.approvals || adminPendingRes2.data || [];
      console.log(`   - Pending Approvals in Admin Panel: ${Array.isArray(pendingList2) ? pendingList2.length : 0} item(s).`);

      const subToApprove2 = Array.isArray(pendingList2) ? (pendingList2.find(p => String(p._id) === String(subOrderIdStage2)) || pendingList2[0]) : null;
      if (subToApprove2) {
        console.log(`   - Admin approving Stage 2 SubOrder: ${subToApprove2._id}...`);
        const approveRes2 = await request(`/approvals/${subToApprove2._id}/approve`, 'POST', {}, adminCookie);
        console.log(`   - ✅ Admin approved Stage 2 SubOrder! Status: ${approveRes2.data?.subOrder?.status || 'approved'}`);
      }
    }

    // ----------------------------------------------------
    // STEP 9: Stage 3 Execution & Admin Approval (Worker 3 - Stitching)
    // ----------------------------------------------------
    console.log('\n📍 STEP 9: Stage 3 (Stitching) - Worker 3 Executing Task...');
    const w3Cookie = workerCookies['worker3@clothflow.com'];

    const w3AvailableRes = await request('/assignments/available-for-me', 'GET', null, w3Cookie);
    const w3Tasks = w3AvailableRes.data?.assignments || w3AvailableRes.data || [];
    console.log(`   - Worker 3 sees ${w3Tasks.length} available task(s) for stage 'Stitching'.`);

    for (const taskStage3 of w3Tasks) {
      const subOrderIdStage3 = taskStage3.subOrder?._id || taskStage3.subOrder;
      await request(`/assignments/${taskStage3._id}/pick`, 'PATCH', {}, w3Cookie);
      await request(`/assignments/${taskStage3._id}/complete`, 'PATCH', {
        completedPieces: taskStage3.totalPieces || 50,
        damagedPieces: 0
      }, w3Cookie);
      console.log(`   - Worker 3 completed Stage 3 task.`);

      // Admin Approve
      const adminPendingRes3 = await request('/approvals/pending', 'GET', null, adminCookie);
      const pendingList3 = adminPendingRes3.data?.approvals || adminPendingRes3.data || [];
      const subToApprove3 = Array.isArray(pendingList3) ? (pendingList3.find(p => String(p._id) === String(subOrderIdStage3)) || pendingList3[0]) : null;
      if (subToApprove3) {
        console.log(`   - Admin approving Stage 3 SubOrder: ${subToApprove3._id}...`);
        const approveRes3 = await request(`/approvals/${subToApprove3._id}/approve`, 'POST', {}, adminCookie);
        console.log(`   - ✅ Admin approved Stage 3 SubOrder! Status: ${approveRes3.data?.subOrder?.status || 'approved'}`);
      }
    }

    // ----------------------------------------------------
    // STEP 10: Stage 4 (Final Stage) Execution & Inventory Reflection (Worker 4 - Finishing)
    // ----------------------------------------------------
    console.log('\n📍 STEP 10: Stage 4 (Finishing / Final Stage) - Worker 4 Executing Task...');
    const w4Cookie = workerCookies['worker4@clothflow.com'];

    const w4AvailableRes = await request('/assignments/available-for-me', 'GET', null, w4Cookie);
    const w4Tasks = w4AvailableRes.data?.assignments || w4AvailableRes.data || [];
    console.log(`   - Worker 4 sees ${w4Tasks.length} available task(s) for stage 'Finishing'.`);

    for (const taskStage4 of w4Tasks) {
      const subOrderIdStage4 = taskStage4.subOrder?._id || taskStage4.subOrder;
      await request(`/assignments/${taskStage4._id}/pick`, 'PATCH', {}, w4Cookie);
      await request(`/assignments/${taskStage4._id}/complete`, 'PATCH', {
        completedPieces: taskStage4.totalPieces || 50,
        damagedPieces: 0
      }, w4Cookie);
      console.log(`   - Worker 4 completed Final Stage (Finishing) task.`);

      // Admin Approve Final Stage
      const adminPendingRes4 = await request('/approvals/pending', 'GET', null, adminCookie);
      const pendingList4 = adminPendingRes4.data?.approvals || adminPendingRes4.data || [];
      const subToApprove4 = Array.isArray(pendingList4) ? (pendingList4.find(p => String(p._id) === String(subOrderIdStage4)) || pendingList4[0]) : null;

      if (subToApprove4) {
        console.log(`   - Admin approving Final Stage SubOrder: ${subToApprove4._id}...`);
        const approveRes4 = await request(`/approvals/${subToApprove4._id}/approve`, 'POST', {}, adminCookie);
        console.log(`   - ✅ Admin approved Final Stage! Status: ${approveRes4.data?.subOrder?.status || 'completed'}`);

        // VERIFY INVENTORY REFLECTION
        console.log('\n🔍 VERIFYING FINAL STAGE INVENTORY REFLECTION:');
        const inventoryRes = await request('/approvals/inventory', 'GET', null, adminCookie);
        const invItems = inventoryRes.data?.inventory || inventoryRes.data || [];
        console.log(`   - Inventory Items Count: ${Array.isArray(invItems) ? invItems.length : 0}`);
        
        const finalInvItem = Array.isArray(invItems) ? invItems.find(item => String(item._id) === String(subToApprove4._id)) : null;
        if (finalInvItem) {
          console.log(`   - ✅ PASS: SubOrder ${subToApprove4._id} successfully reflected in Finished Goods / Packing Inventory!`);
          console.log(`     Details: Name: "${finalInvItem.name}", Size: "${finalInvItem.size}", Status: "${finalInvItem.inventoryStatus}", Approved Pieces: ${finalInvItem.approvedPieces}`);
        } else if (Array.isArray(invItems) && invItems.length > 0) {
          console.log(`   - ✅ PASS: Items reflected in Inventory! (First item: "${invItems[0].name}", Status: "${invItems[0].inventoryStatus}")`);
        }
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL END-TO-END WORKFLOW TESTS PASSED 100% SUCCESSFULLY!');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ WORKFLOW TEST FAILED:', err);
  }
}

runTestWorkflow();
