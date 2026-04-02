import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import {
  createActiveOrderController,
  deleteActiveOrderController,
  getActiveOrderDetailController,
  updateActiveOrderController
} from './activeOrders.controller.js';

export const activeOrdersRouter = Router();

activeOrdersRouter.use(authenticate);

activeOrdersRouter.post('/', createActiveOrderController);
activeOrdersRouter.get('/:activeOrderId', getActiveOrderDetailController);
activeOrdersRouter.put('/:activeOrderId', updateActiveOrderController);
activeOrdersRouter.delete('/:activeOrderId', deleteActiveOrderController);
