import { asyncHandler } from '../../utils/asyncHandler.js';
import { createProduct, deleteProduct, listProducts, updateProduct } from './products.service.js';

export const listProductsController = asyncHandler(async (request, response) => {
  const includeInactive = request.query.includeInactive === 'true';
  const products = await listProducts({ includeInactive });

  response.json({
    products
  });
});

export const createProductController = asyncHandler(async (request, response) => {
  const product = await createProduct(request.body);

  response.status(201).json({
    product
  });
});

export const updateProductController = asyncHandler(async (request, response) => {
  const product = await updateProduct(request.params.productId, request.body);

  response.json({
    product
  });
});

export const deleteProductController = asyncHandler(async (request, response) => {
  await deleteProduct(request.params.productId);

  response.status(204).send();
});

