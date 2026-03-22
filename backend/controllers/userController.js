import bcrypt from 'bcryptjs';
import { AdminModel } from '../models/Admin.js';
import { WorkerModel } from '../models/Worker.js';
import { Style } from '../models/StyleSchema.js';
import { getAvailableWorkerTypes, normalizeStageLabel } from '../utils/workflow.js';

const sanitizeUser = (user, typeOverride = null) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: typeOverride || user.role,
    workerType: user.workerType || '',
    address: user.address || '',
    profileImageUrl: user.profileImageUrl || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const sendCredentialsEmail = async ({ recipientEmail, name, loginEmail, password, role, workerType }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      attempted: false,
      delivered: false,
      message: 'Email delivery skipped. Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable it.'
    };
  }

  const roleText = role === 'worker' && workerType ? `${role} (${workerType})` : role;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [recipientEmail],
      subject: 'Your ClothFlow account credentials',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">Welcome to ClothFlow</h2>
          <p>Hello ${name || 'User'},</p>
          <p>Your account has been created by the admin team.</p>
          <p><strong>Role:</strong> ${roleText}</p>
          <p><strong>Login email:</strong> ${loginEmail}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p>Please sign in and change your password after your first login.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to send credentials email');
  }

  return {
    attempted: true,
    delivered: true,
    message: `Credentials email sent to ${recipientEmail}`
  };
};

export const getUsers = async (_req, res) => {
  try {
    const [admins, workers, styles] = await Promise.all([
      AdminModel.find().select('-password -refreshToken').sort({ createdAt: -1 }).lean(),
      WorkerModel.find().select('-password -refreshToken').sort({ createdAt: -1 }).lean(),
      Style.find().select('steps').lean()
    ]);

    const users = [
      ...admins.map((admin) => sanitizeUser(admin, 'admin')),
      ...workers.map((worker) => sanitizeUser(worker, 'worker'))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      users,
      availableWorkerTypes: getAvailableWorkerTypes(styles)
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      dob,
      address,
      profileImageUrl,
      workerType,
      sendCredentials
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    }

    if (role === 'worker' && !workerType) {
      return res.status(400).json({ success: false, message: 'Worker type is required for worker accounts' });
    }

    const styles = role === 'worker' ? await Style.find().select('steps').lean() : [];
    const availableWorkerTypes = getAvailableWorkerTypes(styles);
    const normalizedWorkerType = normalizeStageLabel(workerType);

    if (role === 'worker' && !availableWorkerTypes.some((type) => type.toLowerCase() === normalizedWorkerType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Worker type must match an existing style stage or Inventory'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingAdmin = await AdminModel.findOne({ email: normalizedEmail }).lean();
    const existingWorker = await WorkerModel.findOne({ email: normalizedEmail }).lean();

    if (existingAdmin || existingWorker) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser;

    if (role === 'admin') {
      newUser = new AdminModel({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phone,
        profileImageUrl
      });
    } else {
      newUser = new WorkerModel({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phone,
        dob,
        address,
        profileImageUrl,
        workerType: normalizedWorkerType
      });
    }

    await newUser.save();

    let emailStatus = {
      attempted: false,
      delivered: false,
      message: 'Credentials email delivery skipped'
    };

    if (sendCredentials) {
      try {
        emailStatus = await sendCredentialsEmail({
          recipientEmail: normalizedEmail,
          name,
          loginEmail: normalizedEmail,
          password,
          role,
          workerType
        });
      } catch (error) {
        emailStatus = {
          attempted: true,
          delivered: false,
          message: error.message || 'Failed to send credentials email'
        };
      }
    }

    return res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      user: sanitizeUser(newUser.toObject ? newUser.toObject() : newUser, role),
      credentials: {
        email: normalizedEmail,
        password
      },
      emailStatus
    });
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
};
