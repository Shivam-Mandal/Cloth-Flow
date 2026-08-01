import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });

export const signCloudinaryParams = (params = {}, apiSecret = process.env.CLOUDINARY_API_SECRET) => {
  if (!apiSecret) {
    throw new Error('CLOUDINARY_API_SECRET is required');
  }

  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${payload}${apiSecret}`)
    .digest('hex');
};

export default {
  utils: {
    api_sign_request: signCloudinaryParams
  }
};
