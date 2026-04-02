import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants/roles.js';
import {
  addItemsToTableBillController,
  checkoutTableBillController,
  createTableController,
  deleteTableController,
  getTableActiveOrderController,
  getTableDetailController,
  listTablesController,
  openTableBillController,
  removeItemFromTableBillController,
  replaceTableBillItemsController,
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
tablesRouter.post('/:tableId/open-bill', openTableBillController);
tablesRouter.post('/:tableId/items', addItemsToTableBillController);
tablesRouter.put('/:tableId/items', replaceTableBillItemsController);
tablesRouter.delete('/:tableId/items/:productId', removeItemFromTableBillController);
tablesRouter.post('/:tableId/checkout', checkoutTableBillController);
