import bcrypt from 'bcryptjs';
import { AdminModel } from '../models/Admin.js';
import { WorkerModel } from '../models/Worker.js';
import { Style } from '../models/StyleSchema.js';
import Stage from '../models/Stage.js';
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
    const [admins, workers, styles, stages] = await Promise.all([
      AdminModel.find().select('-password -refreshToken').sort({ createdAt: -1 }).lean(),
      WorkerModel.find().select('-password -refreshToken').sort({ createdAt: -1 }).lean(),
      Style.find().select('steps').lean(),
      Stage.find({ active: true }).select('name').sort({ sortOrder: 1, createdAt: 1 }).lean()
    ]);
    const stageWorkerTypes = stages.map((stage) => normalizeStageLabel(stage.name)).filter(Boolean);

    const users = [
      ...admins.map((admin) => sanitizeUser(admin, 'admin')),
      ...workers.map((worker) => sanitizeUser(worker, 'worker'))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      users,
      availableWorkerTypes: [...new Set([...getAvailableWorkerTypes(styles), ...stageWorkerTypes])]
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

    const [styles, stages] = role === 'worker'
      ? await Promise.all([
          Style.find().select('steps').lean(),
          Stage.find({ active: true }).select('name').sort({ sortOrder: 1, createdAt: 1 }).lean()
        ])
      : [[], []];
    const stageWorkerTypes = stages.map((stage) => normalizeStageLabel(stage.name)).filter(Boolean);
    const availableWorkerTypes = [...new Set([...getAvailableWorkerTypes(styles), ...stageWorkerTypes])];
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

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      profileImageUrl,
      workerType,
      sendCredentials
    } = req.body;

    if (!id || !role) {
      return res.status(400).json({ success: false, message: 'User id and role are required' });
    }

    if (!['admin', 'worker'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid user role' });
    }

    const Model = role === 'admin' ? AdminModel : WorkerModel;
    const user = await Model.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : user.email;

    if (!name || !normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const [existingAdmin, existingWorker] = await Promise.all([
      AdminModel.findOne({ email: normalizedEmail }).select('_id').lean(),
      WorkerModel.findOne({ email: normalizedEmail }).select('_id').lean()
    ]);

    const emailBelongsToAnotherUser =
      (existingAdmin && existingAdmin._id.toString() !== id) ||
      (existingWorker && existingWorker._id.toString() !== id);

    if (emailBelongsToAnotherUser) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    user.name = name;
    user.email = normalizedEmail;
    user.phone = phone || '';

    if (profileImageUrl !== undefined) {
      user.profileImageUrl = profileImageUrl;
    }

    if (role === 'worker') {
      const [styles, stages] = await Promise.all([
        Style.find().select('steps').lean(),
        Stage.find({ active: true }).select('name').sort({ sortOrder: 1, createdAt: 1 }).lean()
      ]);
      const stageWorkerTypes = stages.map((stage) => normalizeStageLabel(stage.name)).filter(Boolean);
      const availableWorkerTypes = [...new Set([...getAvailableWorkerTypes(styles), ...stageWorkerTypes])];
      const normalizedWorkerType = normalizeStageLabel(workerType || user.workerType);

      if (!normalizedWorkerType) {
        return res.status(400).json({ success: false, message: 'Worker type is required for worker accounts' });
      }

      if (!availableWorkerTypes.some((type) => type.toLowerCase() === normalizedWorkerType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Worker type must match an existing style stage or Inventory'
        });
      }

      user.workerType = normalizedWorkerType;
      user.address = address || '';
    }

    const trimmedPassword = password ? String(password).trim() : '';

    if (trimmedPassword) {
      user.password = await bcrypt.hash(trimmedPassword, 10);
      user.refreshToken = undefined;
    }

    await user.save();

    let emailStatus = {
      attempted: false,
      delivered: false,
      message: trimmedPassword
        ? 'Credentials email delivery skipped'
        : 'Credentials email skipped because password was not changed'
    };

    if (sendCredentials && trimmedPassword) {
      try {
        emailStatus = await sendCredentialsEmail({
          recipientEmail: normalizedEmail,
          name,
          loginEmail: normalizedEmail,
          password: trimmedPassword,
          role,
          workerType: role === 'worker' ? user.workerType : undefined
        });
      } catch (error) {
        emailStatus = {
          attempted: true,
          delivered: false,
          message: error.message || 'Failed to send credentials email'
        };
      }
    }

    return res.json({
      success: true,
      message: `${role} account updated successfully`,
      user: sanitizeUser(user.toObject ? user.toObject() : user, role),
      credentials: trimmedPassword
        ? {
            email: normalizedEmail,
            password: trimmedPassword
          }
        : null,
      emailStatus
    });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
};
