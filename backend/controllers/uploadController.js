import cloudinary from '../config/cloudinary.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE = Number(process.env.CLOUDINARY_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024);
const MAX_FILE_COUNT = Number(process.env.CLOUDINARY_MAX_FILE_COUNT || 5);

export const createCloudinaryUploadSignature = async (req, res) => {
  try {
    const { files = [] } = req.body || {};
    const fileList = Array.isArray(files) ? files : [];

    if (fileList.length < 1 || fileList.length > MAX_FILE_COUNT) {
      return res.status(400).json({
        success: false,
        message: `Upload requires between 1 and ${MAX_FILE_COUNT} files`
      });
    }

    for (const file of fileList) {
      if (!ALLOWED_IMAGE_TYPES.has(file?.type)) {
        return res.status(400).json({ success: false, message: 'Unsupported image type' });
      }
      if (!Number.isFinite(Number(file?.size)) || Number(file.size) <= 0 || Number(file.size) > MAX_FILE_SIZE) {
        return res.status(400).json({ success: false, message: 'Image file size is not allowed' });
      }
    }

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
    return res.status(500).json({ success: false, message: 'Unable to prepare upload' });
  }
};
