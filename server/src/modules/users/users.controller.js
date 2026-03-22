import { asyncHandler } from '../../utils/asyncHandler.js';
import { createUser, deleteUser, listUsers, updateUser } from './users.service.js';

export const listUsersController = asyncHandler(async (_request, response) => {
  const users = await listUsers();

  response.json({
    users
  });
});

export const createUserController = asyncHandler(async (request, response) => {
  const user = await createUser(request.body);

  response.status(201).json({
    user
  });
});

export const updateUserController = asyncHandler(async (request, response) => {
  const user = await updateUser(request.params.userId, request.body);

  response.json({
    user
  });
});

export const deleteUserController = asyncHandler(async (request, response) => {
  await deleteUser(request.params.userId);

  response.status(204).send();
});

