import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ROLES } from '../../constants/roles.js';
import {
  createProductController,
  deleteProductController,
  listProductsController,
  updateProductController
} from './products.controller.js';

export const productsRouter = Router();

productsRouter.use(authenticate);

productsRouter.get('/', listProductsController);
productsRouter.post('/', authorize(ROLES.ADMIN), createProductController);
productsRouter.patch('/:productId', authorize(ROLES.ADMIN), updateProductController);
productsRouter.delete('/:productId', authorize(ROLES.ADMIN), deleteProductController);

