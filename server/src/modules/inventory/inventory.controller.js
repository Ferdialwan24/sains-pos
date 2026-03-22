import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
  updateInventoryItem
} from './inventory.service.js';

export const listInventoryController = asyncHandler(async (_request, response) => {
  const items = await listInventoryItems();

  response.json({
    items
  });
});

export const createInventoryController = asyncHandler(async (request, response) => {
  const item = await createInventoryItem(request.body);

  response.status(201).json({
    item
  });
});

export const updateInventoryController = asyncHandler(async (request, response) => {
  const item = await updateInventoryItem(request.params.itemId, request.body);

  response.json({
    item
  });
});

export const deleteInventoryController = asyncHandler(async (request, response) => {
  await deleteInventoryItem(request.params.itemId);

  response.status(204).send();
});

