import { login } from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const loginController = asyncHandler(async (request, response) => {
  const result = await login(request.body);

  response.json(result);
});

export const meController = asyncHandler(async (request, response) => {
  response.json({
    user: request.user
  });
});

