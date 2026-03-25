import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ROLES } from '../../constants/roles.js';
import { listInventoryController, restockInventoryController } from './inventory.controller.js';

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);

inventoryRouter.get('/', listInventoryController);
inventoryRouter.post('/', authorize(ROLES.ADMIN), restockInventoryController);
inventoryRouter.post('/restock', authorize(ROLES.ADMIN), restockInventoryController);
