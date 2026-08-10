import { AdminModel } from "../models/Admin.js";
import { WorkerModel } from "../models/Worker.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { setCsrfCookie } from "../middlewares/csrfMiddleware.js";

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXPIRESIn || '15m';
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRESIn || '7d';

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT access and refresh secrets are required');
}

// Sign JWT
function createAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}
function createRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

const findAuthenticatedUser = async (userId, includePassword = false) => {
  const projection = includePassword ? '' : '-password -refreshToken';
  let user = await AdminModel.findById(userId).select(projection);
  if (user) return { user, model: AdminModel, role: 'admin' };

  user = await WorkerModel.findById(userId).select(projection);
  if (user) return { user, model: WorkerModel, role: 'worker' };

  return { user: null, model: null, role: null };
};

const serializeUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  delete data.refreshToken;
  return data;
};

const isEmailTakenByAnotherUser = async (email, currentUserId) => {
  const [admin, worker] = await Promise.all([
    AdminModel.findOne({ email }).select('_id').lean(),
    WorkerModel.findOne({ email }).select('_id').lean()
  ]);

  return [admin, worker].some((record) => record && String(record._id) !== String(currentUserId));
};

// Signup
export const signup = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public signup is disabled. Users must be created by an authorized admin.'
  });
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Missing email or password" });

    let user = await AdminModel.findOne({ email: email.toLowerCase() });
    // let role = "admin";

    if (!user) {
      user = await WorkerModel.findOne({ email: email.toLowerCase() });
      // role = "worker";
    }

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password" });

    // Update lastLogin for workers
    if (user.role === 'worker') {
      user.lastLogin = new Date();
    }

    const payload = { id: user._id.toString(), role: user.role, name: user.name };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken({ id: user._id.toString() });

    user.refreshToken = refreshToken;
    await user.save();

    const isProd = process.env.NODE_ENV === 'production';
    const csrfToken = setCsrfCookie(res);

    // access token cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 15, // 15 minutes
      path: "/",
      // domain: "localhost"
    });

    // refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: "/",

    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      csrfToken,
      // token,
      // user: { id: user._id, name: user.name, email: user.email, role },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      // clear from any user that has this refresh token
      const admin = await AdminModel.findOneAndUpdate({ refreshToken }, { $unset: { refreshToken: 1 } });
      if (!admin) {
        await WorkerModel.findOneAndUpdate({ refreshToken }, { $unset: { refreshToken: 1 } });
      }
    }

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = { path: '/', httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('csrfToken', { path: '/', secure: isProd, sameSite: isProd ? 'none' : 'lax' });
    
    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//refresh handler
export const refreshTokenHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ success: false, message: "No refresh token provided" });

    let user = await AdminModel.findOne({ refreshToken });
    if (!user) {
      user = await WorkerModel.findOne({ refreshToken });
    }
    if (!user) return res.status(403).json({ success: false, message: "Invalid refresh token" });

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err || decoded.id !== user._id.toString()) {
        return res.status(403).json({ success: false, message: "Invalid refresh token" });
      }

      const payload = { id: user._id.toString(), role: user.role, name: user.name };
      const newAccessToken = createAccessToken(payload);
      const newRefreshToken = createRefreshToken({ id: user._id.toString() });

      user.refreshToken = newRefreshToken;
      await user.save();   // <--- important: await

      const isProd = process.env.NODE_ENV === 'production';
      const csrfToken = setCsrfCookie(res);

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 1000 * 60 * 15,
        path: "/",
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
      });

      return res.status(200).json({ success: true, message: "Token refreshed", csrfToken });
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// me handler
export const me = async (req, res) => {
  try {
     if (!req.user?.id) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const userId = req.user.id;
    let user = await AdminModel.findById(userId).select('-password -refreshToken');
    if (!user) {
      user = await WorkerModel.findById(userId).select('-password -refreshToken');
    }
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }

    const { user } = await findAuthenticatedUser(req.user.id, true);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (await isEmailTakenByAnotherUser(email, user._id)) {
      return res.status(409).json({ success: false, message: 'Email is already in use' });
    }

    user.name = name;
    user.email = email;
    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: serializeUser(user)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const changePassword = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    const { user } = await findAuthenticatedUser(req.user.id, true);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
