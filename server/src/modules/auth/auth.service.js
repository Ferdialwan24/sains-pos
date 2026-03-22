import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';

const signToken = (user) =>
  jwt.sign(
    {
      role: user.role,
      username: user.username
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      subject: user.id
    }
  );

export const login = async ({ username, password }) => {
  const normalizedUsername = username?.trim().toLowerCase();

  if (!normalizedUsername || !password) {
    throw new ApiError(400, 'Username and password are required');
  }

  const user = await User.findOne({ username: normalizedUsername, isActive: true }).select('+passwordHash');

  if (!user) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid username or password');
  }

  return {
    token: signToken(user),
    user: {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      username: user.username
    }
  };
};

