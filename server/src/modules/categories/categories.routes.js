import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants/roles.js';
import {
  createCategoryController,
  deleteCategoryController,
  listCategoriesController,
  updateCategoryController
} from './categories.controller.js';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get('/', listCategoriesController);
categoriesRouter.post('/', authorize(ROLES.ADMIN), createCategoryController);
categoriesRouter.patch('/:categoryId', authorize(ROLES.ADMIN), updateCategoryController);
categoriesRouter.delete('/:categoryId', authorize(ROLES.ADMIN), deleteCategoryController);
