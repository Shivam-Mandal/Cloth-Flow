const buckets = new Map();

export const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 100 } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip || req.socket?.remoteAddress || 'unknown'}:${req.originalUrl}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message: 'Too many requests' });
    }

    return next();
  };
};
