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

usersRouter.use(authenticate);

usersRouter.get('/', authorize(ROLES.ADMIN, ROLES.DEMO), listUsersController);
usersRouter.post('/', authorize(ROLES.ADMIN), createUserController);
usersRouter.patch('/:userId', authorize(ROLES.ADMIN), updateUserController);
usersRouter.delete('/:userId', authorize(ROLES.ADMIN), deleteUserController);
