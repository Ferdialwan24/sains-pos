import { asyncHandler } from '../../utils/asyncHandler.js';
import { listInventoryItems, restockInventoryItem } from './inventory.service.js';

export const listInventoryController = asyncHandler(async (_request, response) => {
  const items = await listInventoryItems();

  response.json({
    items
  });
});

export const restockInventoryController = asyncHandler(async (request, response) => {
  const item = await restockInventoryItem(request.body);

  response.status(201).json({
    item
  });
});
