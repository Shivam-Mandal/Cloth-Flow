import cloudinary from '../config/cloudinary.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE = Number(process.env.CLOUDINARY_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024);
const MAX_FILE_COUNT = Number(process.env.CLOUDINARY_MAX_FILE_COUNT || 5);
const MAX_FILE_NAME_LENGTH = 180;

export const validateCloudinaryUploadFiles = (files = [], {
  allowedTypes = ALLOWED_IMAGE_TYPES,
  maxFileSize = MAX_FILE_SIZE,
  maxFileCount = MAX_FILE_COUNT
} = {}) => {
  const fileList = Array.isArray(files) ? files : [];

  if (fileList.length < 1 || fileList.length > maxFileCount) {
    const error = new Error(`Upload requires between 1 and ${maxFileCount} files`);
    error.status = 400;
    throw error;
  }

  for (const file of fileList) {
    const name = typeof file?.name === 'string' ? file.name.trim() : '';
    const size = Number(file?.size);

    if (!name || name.length > MAX_FILE_NAME_LENGTH || /[/\\]/.test(name)) {
      const error = new Error('Invalid image file name');
      error.status = 400;
      throw error;
    }

    if (!allowedTypes.has(file?.type)) {
      const error = new Error('Unsupported image type');
      error.status = 400;
      throw error;
    }

    if (!Number.isFinite(size) || size <= 0 || size > maxFileSize) {
      const error = new Error('Image file size is not allowed');
      error.status = 400;
      throw error;
    }
  }

  return fileList;
};

export const createCloudinaryUploadSignature = async (req, res) => {
  try {
    const { files = [] } = req.body || {};
    validateCloudinaryUploadFiles(files);

    const timestamp = Math.round(Date.now() / 1000);
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'clothflow/styles';
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    return res.status(200).json({
      success: true,
      data: {
        timestamp,
        folder,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        maxFileSize: MAX_FILE_SIZE,
        maxFileCount: MAX_FILE_COUNT,
        allowedTypes: [...ALLOWED_IMAGE_TYPES]
      }
    });
  } catch (error) {
    console.error('createCloudinaryUploadSignature error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Unable to prepare upload'
    });
  }
};
