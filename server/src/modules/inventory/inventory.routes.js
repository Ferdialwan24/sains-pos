import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ROLES } from '../../constants/roles.js';
import {
  createInventoryController,
  deleteInventoryController,
  listInventoryController,
  updateInventoryController
} from './inventory.controller.js';

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);

inventoryRouter.get('/', listInventoryController);
inventoryRouter.post('/', authorize(ROLES.ADMIN), createInventoryController);
inventoryRouter.patch('/:itemId', authorize(ROLES.ADMIN), updateInventoryController);
inventoryRouter.delete('/:itemId', authorize(ROLES.ADMIN), deleteInventoryController);

