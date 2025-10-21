// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

export const verifyAccessToken = (req, res, next) => {
  try {
    // Read token from cookie first
    const token = req.cookies?.accessToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ success: false, message: 'No access token provided' });

    jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      req.user = { id: decoded.id, role: decoded.role, name: decoded.name };
      next();
    });
  } catch (err) {
    next(err);
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (req.user.role !== role) return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
};
