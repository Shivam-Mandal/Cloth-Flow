// backend/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });

import {WorkerModel} from '../models/Worker.js';
import {AdminModel} from '../models/Admin.js';
import { isInventoryWorkerType } from '../utils/workflow.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET;

if (!JWT_ACCESS_SECRET) {
  throw new Error('JWT access secret is required');
}

/**
 * verifyAccessToken - verifies JWT from cookie or Authorization header and attaches user to req.user
 */
export const verifyAccessToken = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]) ||
      null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No access token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Normalize id fields so controllers that expect either id or _id will work
    const userId = decoded?.id || decoded?._id || decoded?.userId || null;
    const role = decoded?.role || decoded?.roles || null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: invalid token payload' });
    }

    // Base user object from token
    req.user = {
      id: userId,
      _id: userId,           // ensure _id exists for controllers expecting it
      role,
      name: decoded?.name || decoded?.username || null,
      workerType: decoded?.workerType || null, // present if you included it at sign time
      raw: decoded,
    };

    // If workerType is not present in token but role indicates worker, fetch from DB
    // (Only do this when necessary to avoid DB hit on every request)
    if (!req.user.workerType && (role === 'worker' || role === 'Worker' || role === 'worker_role')) {
      try {
        const worker = await WorkerModel.findById(userId).select('workerType').lean();
        if (worker && worker.workerType) {
          req.user.workerType = worker.workerType;
        }
      } catch (err) {
        console.warn('Could not fetch workerType from DB:', err.message);
      }
    }

    // If you have separate schemas and don't have role in token, you can attempt to detect:
    if (!role && !req.user.workerType) {
      // optional fallback: try to find worker first, then admin
      try {
        const worker = await WorkerModel.findById(userId).select('workerType').lean();
        if (worker) {
          req.user.role = req.user.role || 'worker';
          req.user.workerType = worker.workerType || null;
        } else {
          // optionally check admin
          const admin = await AdminModel.findById(userId).select('role').lean();
          if (admin) req.user.role = req.user.role || admin.role || 'admin';
        }
      } catch (err) {
        console.warn('Fallback DB detection error:', err.message);
      }
    }

    return next();
  } catch (err) {
    console.error('verifyAccessToken error:', err);
    return res.status(500).json({ success: false, message: 'Server error in token verification' });
  }
};

/**
 * requireRole - accepts either a single role string or an array of allowed roles.
 * Usage:
 *   requireRole('admin')
 *   requireRole(['admin','manager'])
 */
export const requireRole = (allowed) => {
  // normalize allowed into an array for easier checks
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  return (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const userRole = req.user.role;

      // If userRole is an array, check intersection; otherwise check inclusion
      const hasRole = Array.isArray(userRole)
        ? userRole.some((r) => allowedRoles.includes(r))
        : allowedRoles.includes(userRole);

      if (!hasRole) {
        return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
      }

      next();
    } catch (err) {
      console.error('requireRole error:', err);
      return res.status(500).json({ success: false, message: 'Server error in authorization' });
    }
  };
};

export const requireInventoryAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

  if (req.user.role === 'admin') return next();
  if (req.user.role === 'worker' && isInventoryWorkerType(req.user.workerType)) return next();

  return res.status(403).json({ success: false, message: 'Inventory permission required' });
};
