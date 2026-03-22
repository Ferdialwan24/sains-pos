import bcrypt from 'bcryptjs';
import { ROLES } from '../../constants/roles.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  username: user.username,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const listUsers = async () => {
  const users = await User.find().sort({ createdAt: -1 });
  return users.map(sanitizeUser);
};

export const createUser = async ({ fullName, username, password, role = ROLES.CASHIER, isActive = true }) => {
  if (!fullName?.trim() || !username?.trim() || !password?.trim()) {
    throw new ApiError(400, 'Full name, username, and password are required');
  }

  const existingUser = await User.findOne({ username: username.trim().toLowerCase() });

  if (existingUser) {
    throw new ApiError(409, 'Username is already in use');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    fullName: fullName.trim(),
    username: username.trim().toLowerCase(),
    passwordHash,
    role,
    isActive
  });

  return sanitizeUser(user);
};

export const updateUser = async (userId, payload) => {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (payload.fullName !== undefined) {
    user.fullName = payload.fullName.trim();
  }

  if (payload.username !== undefined) {
    user.username = payload.username.trim().toLowerCase();
  }

  if (payload.role !== undefined) {
    if (user.role === ROLES.ADMIN && payload.role !== ROLES.ADMIN && user.isActive) {
      const activeAdminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });

      if (activeAdminCount <= 1) {
        throw new ApiError(400, 'At least one active admin must remain in the system');
      }
    }

    user.role = payload.role;
  }

  if (payload.isActive !== undefined) {
    if (user.role === ROLES.ADMIN && payload.isActive === false && user.isActive) {
      const activeAdminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });

      if (activeAdminCount <= 1) {
        throw new ApiError(400, 'At least one active admin must remain in the system');
      }
    }

    user.isActive = payload.isActive;
  }

  if (payload.password?.trim()) {
    user.passwordHash = await bcrypt.hash(payload.password, 10);
  }

  await user.save();

  return sanitizeUser(user);
};

export const deleteUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === ROLES.ADMIN) {
    const activeAdminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });

    if (activeAdminCount <= 1) {
      throw new ApiError(400, 'At least one active admin must remain in the system');
    }
  }

  await user.deleteOne();
};
