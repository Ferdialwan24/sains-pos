import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createActiveOrder,
  deleteActiveOrder,
  getActiveOrderDetail,
  updateActiveOrder
} from './activeOrders.service.js';

export const createActiveOrderController = asyncHandler(async (request, response) => {
  const activeOrder = await createActiveOrder(request.body, request.user);

  response.status(201).json({
    activeOrder
  });
});

export const getActiveOrderDetailController = asyncHandler(async (request, response) => {
  const activeOrder = await getActiveOrderDetail(request.params.activeOrderId);

  response.json({
    activeOrder
  });
});

export const updateActiveOrderController = asyncHandler(async (request, response) => {
  const activeOrder = await updateActiveOrder(request.params.activeOrderId, request.body);

  response.json({
    activeOrder
  });
});

export const deleteActiveOrderController = asyncHandler(async (request, response) => {
  await deleteActiveOrder(request.params.activeOrderId);

  response.status(204).send();
});
