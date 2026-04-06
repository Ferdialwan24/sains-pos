import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants/roles.js';
import {
  createTableController,
  deleteTableController,
  getTableActiveOrderController,
  getTableDetailController,
  listTablesController,
  updateTableController
} from './tables.controller.js';

export const tablesRouter = Router();

tablesRouter.use(authenticate);

tablesRouter.get('/', listTablesController);
tablesRouter.get('/:tableId/active-order', getTableActiveOrderController);
tablesRouter.get('/:tableId', getTableDetailController);
tablesRouter.post('/', authorize(ROLES.ADMIN), createTableController);
tablesRouter.patch('/:tableId', authorize(ROLES.ADMIN), updateTableController);
tablesRouter.delete('/:tableId', authorize(ROLES.ADMIN), deleteTableController);
