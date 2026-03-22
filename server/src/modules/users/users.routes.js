import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ROLES } from '../../constants/roles.js';
import {
  createUserController,
  deleteUserController,
  listUsersController,
  updateUserController
} from './users.controller.js';

export const usersRouter = Router();

usersRouter.use(authenticate, authorize(ROLES.ADMIN));

usersRouter.get('/', listUsersController);
usersRouter.post('/', createUserController);
usersRouter.patch('/:userId', updateUserController);
usersRouter.delete('/:userId', deleteUserController);
