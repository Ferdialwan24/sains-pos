import { ApiError } from '../utils/ApiError.js';

export const authorize = (...allowedRoles) => (request, _response, next) => {
  if (!request.user || !allowedRoles.includes(request.user.role)) {
    return next(new ApiError(403, 'You do not have access to this resource'));
  }

  next();
};
