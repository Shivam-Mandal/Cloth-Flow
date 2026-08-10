import test from 'node:test';
import assert from 'node:assert/strict';

import { validateRuntimeEnv } from '../config/env.js';

test('runtime env validation accepts required production settings', () => {
  assert.equal(validateRuntimeEnv({
    DATABASE_URI: 'mongodb://localhost:27017/cloth-flow-test',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    PORT: '5000',
    CORS_ORIGINS: 'https://example.com,http://localhost:5173'
  }), true);
});

test('runtime env validation rejects missing required secrets and invalid values', () => {
  assert.throws(() => validateRuntimeEnv({
    DATABASE_URI: '',
    JWT_ACCESS_SECRET: '',
    JWT_REFRESH_SECRET: 'refresh-secret',
    PORT: '-1',
    CORS_ORIGINS: 'not-a-url'
  }), /DATABASE_URI is required/);
});
