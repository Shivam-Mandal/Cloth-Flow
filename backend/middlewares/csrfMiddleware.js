import crypto from 'crypto';

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/refresh-token',
  '/api/auth/csrf-token'
]);

export const createCsrfToken = () => crypto.randomBytes(32).toString('hex');

export const setCsrfCookie = (res) => {
  const token = createCsrfToken();
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
  return token;
};

export const issueCsrfToken = (req, res) => {
  const csrfToken = setCsrfCookie(res);
  return res.status(200).json({ success: true, csrfToken });
};

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }

  return next();
};
