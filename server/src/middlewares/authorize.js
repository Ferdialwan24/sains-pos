import { ApiError } from '../utils/ApiError.js';

export const authorize = (...allowedRoles) => (request, _response, next) => {
  if (!request.user || !allowedRoles.includes(request.user.role)) {
    const message = request.user?.role === 'demo'
      ? 'This action is not permitted in demo mode'
      : 'You do not have access to this resource';
    return next(new ApiError(403, message));
  }

  next();
};
