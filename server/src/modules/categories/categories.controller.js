import { asyncHandler } from '../../utils/asyncHandler.js';
import { createCategory, deleteCategory, listCategories, updateCategory } from './categories.service.js';

export const listCategoriesController = asyncHandler(async (_request, response) => {
  const categories = await listCategories();

  response.json({
    categories
  });
});

export const createCategoryController = asyncHandler(async (request, response) => {
  const category = await createCategory(request.body);

  response.status(201).json({
    category
  });
});

export const updateCategoryController = asyncHandler(async (request, response) => {
  const category = await updateCategory(request.params.categoryId, request.body);

  response.json({
    category
  });
});

export const deleteCategoryController = asyncHandler(async (request, response) => {
  await deleteCategory(request.params.categoryId);

  response.status(204).send();
});
