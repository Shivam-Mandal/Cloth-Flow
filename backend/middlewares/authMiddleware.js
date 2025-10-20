// middlewares/auth.js

import jwt from "jsonwebtoken";


// Make sure to set JWT_ACCESS_SECRET in your environment variables
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET not defined in environment");
}

export const verifyAccessToken = (req, res, next) => {
  // try {

  //   // if (req.method === "OPTIONS") return next(); // don't auth preflight

  //   // Get token from cookie
  //   const token = req.cookies?.token;
  //   console.log("Token from cookie:", token);
  //   if (!token) {
  //     return res.status(401).json({ success: false, message: "No token provided" });
  //   }

  //   // Verify token
  //   const payload = jwt.verify(token, JWT_ACCESS_SECRET);
  //   req.user = payload;
  //   next();

  // } catch (err) {
  //   console.error("[verifyToken] unexpected error:", err.message);
  //   return res.status(401).json({ success: false, message: "Authentication failed" });
  // }

  try {
    // Helpful debug (remove in production)
    // console.log('Incoming cookies:', req.cookies);
    // console.log('Authorization header:', req.headers.authorization);

    // Accept several possible cookie names used across your codebase
    const possibleCookieNames = ['accessToken', 'token', 'jwt'];
    let token = null;

    if (req.cookies) {
      for (const name of possibleCookieNames) {
        if (req.cookies[name]) {
          token = req.cookies[name];
          break;
        }
      }
    }

    // Fallback to Authorization header if present
    if (!token && req.headers?.authorization) {
      token = req.headers.authorization;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // strip "Bearer " prefix if present
    if (typeof token === 'string' && token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch (err) {
      // Differentiate common errors
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Access token expired' });
      }
      // JsonWebTokenError (invalid signature, malformed, etc.)
      console.error('[verifyAccessToken] jwt verify error:', err);
      return res.status(401).json({ success: false, message: 'Invalid token signature' });
    }

    req.user = payload;
    return next();
  } catch (err) {
    console.error('[verifyAccessToken] unexpected error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const requireRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient privileges" });
    }

    return next();
  };
};
