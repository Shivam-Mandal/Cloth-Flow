import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNonNegativeNumber } from '../controllers/stockController.js';

test('stock numeric validation accepts finite non-negative values', () => {
  assert.equal(parseNonNegativeNumber('12.5', 'quantityKg', { required: true }), 12.5);
  assert.equal(parseNonNegativeNumber(0, 'unitPrice', { required: true }), 0);
  assert.equal(parseNonNegativeNumber('', 'sizeMm'), undefined);
});

test('stock numeric validation rejects missing required, negative, and non-finite values', () => {
  assert.throws(() => parseNonNegativeNumber('', 'quantityKg', { required: true }), /required/);
  assert.throws(() => parseNonNegativeNumber('-1', 'quantityKg'), /non-negative/);
  assert.throws(() => parseNonNegativeNumber('abc', 'quantityKg'), /non-negative/);
});
