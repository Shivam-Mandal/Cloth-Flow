import test from 'node:test';
import assert from 'node:assert/strict';

import { validateCloudinaryUploadFiles } from '../controllers/uploadController.js';

test('cloudinary upload file validation accepts allowed image metadata', () => {
  const files = validateCloudinaryUploadFiles([
    { name: 'style.webp', type: 'image/webp', size: 1024 }
  ], { maxFileSize: 2048, maxFileCount: 2 });

  assert.equal(files.length, 1);
});

test('cloudinary upload file validation rejects unsafe metadata', () => {
  assert.throws(() => validateCloudinaryUploadFiles([], { maxFileCount: 2 }), /between 1 and 2/);
  assert.throws(() => validateCloudinaryUploadFiles([
    { name: '../style.png', type: 'image/png', size: 1024 }
  ]), /Invalid image file name/);
  assert.throws(() => validateCloudinaryUploadFiles([
    { name: 'style.svg', type: 'image/svg+xml', size: 1024 }
  ]), /Unsupported image type/);
  assert.throws(() => validateCloudinaryUploadFiles([
    { name: 'style.png', type: 'image/png', size: 0 }
  ]), /size is not allowed/);
});
