const hasUnsafeKey = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasUnsafeKey);

  return Object.entries(value).some(([key, nested]) => {
    if (key.startsWith('$') || key.includes('.')) return true;
    return hasUnsafeKey(nested);
  });
};

export const rejectUnsafeKeys = (req, res, next) => {
  if (hasUnsafeKey(req.body) || hasUnsafeKey(req.query) || hasUnsafeKey(req.params)) {
    return res.status(400).json({ success: false, message: 'Invalid request payload' });
  }
  return next();
};
