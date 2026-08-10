import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';

const createRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

test('requireRole allows matching roles and rejects non-matching roles', async () => {
  const { requireRole } = await import('../middlewares/authMiddleware.js');
  const allowNextCalls = [];
  const denyNextCalls = [];

  requireRole(['admin'])({ user: { role: 'admin' } }, createRes(), () => allowNextCalls.push(true));
  const deniedRes = createRes();
  requireRole(['admin'])({ user: { role: 'worker' } }, deniedRes, () => denyNextCalls.push(true));

  assert.equal(allowNextCalls.length, 1);
  assert.equal(denyNextCalls.length, 0);
  assert.equal(deniedRes.statusCode, 403);
});

test('requireInventoryAccess allows admins and inventory workers only', async () => {
  const { requireInventoryAccess } = await import('../middlewares/authMiddleware.js');
  const adminCalls = [];
  const inventoryCalls = [];
  const deniedCalls = [];

  requireInventoryAccess({ user: { role: 'admin' } }, createRes(), () => adminCalls.push(true));
  requireInventoryAccess({ user: { role: 'worker', workerType: 'Inventory' } }, createRes(), () => inventoryCalls.push(true));
  const deniedRes = createRes();
  requireInventoryAccess({ user: { role: 'worker', workerType: 'Cutting' } }, deniedRes, () => deniedCalls.push(true));

  assert.equal(adminCalls.length, 1);
  assert.equal(inventoryCalls.length, 1);
  assert.equal(deniedCalls.length, 0);
  assert.equal(deniedRes.statusCode, 403);
});
