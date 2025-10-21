import { AdminModel } from "../models/Admin.js";
import { WorkerModel } from "../models/Worker.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXPIRESIn || '15m';
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRESIn || '7d';

// Sign JWT
function createAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}
function createRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

// Signup
export const signup = async (req, res) => {
  try {
    const { name, email, password, role, phone, dob, address, profileImageUrl } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const existingAdmin = await AdminModel.findOne({ email: email.toLowerCase() });
    const existingWorker = await WorkerModel.findOne({ email: email.toLowerCase() });
    if (existingAdmin || existingWorker)
      return res.status(409).json({ success: false, message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser;
    if (role === "admin") {
      newUser = new AdminModel({ name, email: email.toLowerCase(), password: hashedPassword, phone, profileImageUrl });
    } else {
      newUser = new WorkerModel({ name, email: email.toLowerCase(), password: hashedPassword, phone, dob, address, profileImageUrl });
    }

    await newUser.save();

    // const token = signToken({ id: newUser._id, email: newUser.email, role });



    return res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
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

    const payload = { id: user._id.toString(), role: user.role, name: user.name };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken({ id: user._id.toString() });

    user.refreshToken = refreshToken;
    await user.save();

    const isProd = process.env.NODE_ENV === 'production';

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

    // clear cookies (set sameSite/secure as login does)
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
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
    console.log("Refresh token from cookie:", refreshToken);
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

      return res.status(200).json({ success: true, message: "Token refreshed" });
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
    console.log("me handler userId:", userId);
    let user = await AdminModel.findById(userId).select('-password -refreshToken');
    if (!user) {
      user = await WorkerModel.findById(userId).select('-password -refreshToken');
    }
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
