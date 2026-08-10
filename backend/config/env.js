const REQUIRED_ENV_VARS = [
  'DATABASE_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

const OPTIONAL_NUMBER_ENV_VARS = [
  'PORT',
  'REQUEST_TIMEOUT_MS',
  'HEADERS_TIMEOUT_MS',
  'CLOUDINARY_MAX_FILE_SIZE_BYTES',
  'CLOUDINARY_MAX_FILE_COUNT'
];

const OPTIONAL_URL_LIST_ENV_VARS = [
  'CORS_ORIGINS'
];

export const validateRuntimeEnv = (env = process.env) => {
  const errors = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!env[key] || !String(env[key]).trim()) {
      errors.push(`${key} is required`);
    }
  }

  for (const key of OPTIONAL_NUMBER_ENV_VARS) {
    if (env[key] === undefined || env[key] === '') continue;
    const value = Number(env[key]);
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`${key} must be a positive number`);
    }
  }

  for (const key of OPTIONAL_URL_LIST_ENV_VARS) {
    if (!env[key]) continue;
    const origins = String(env[key]).split(',').map((origin) => origin.trim()).filter(Boolean);
    for (const origin of origins) {
      try {
        new URL(origin);
      } catch {
        errors.push(`${key} contains invalid origin: ${origin}`);
      }
    }
  }

  if (errors.length > 0) {
    const error = new Error(`Invalid runtime configuration: ${errors.join('; ')}`);
    error.status = 500;
    error.details = errors;
    throw error;
  }

  return true;
};
