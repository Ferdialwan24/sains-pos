import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const authenticate = async (request, _response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication token is required'));
  }

  const token = authorization.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User account is not available');
    }

    request.user = {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      username: user.username
    };

    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Invalid authentication token'));
  }
};

