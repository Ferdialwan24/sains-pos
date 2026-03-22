import { InventoryItem } from '../../models/InventoryItem.js';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';

export const listInventoryItems = async () => {
  return InventoryItem.find().sort({ name: 1 });
};

export const createInventoryItem = async ({ name, unit, quantity = 0 }) => {
  if (!name?.trim() || !unit?.trim()) {
    throw new ApiError(400, 'Item name and unit are required');
  }

  return InventoryItem.create({
    name: name.trim(),
    unit: unit.trim(),
    quantity
  });
};

export const updateInventoryItem = async (itemId, payload) => {
  const item = await InventoryItem.findById(itemId);

  if (!item) {
    throw new ApiError(404, 'Inventory item not found');
  }

  if (payload.name !== undefined) {
    item.name = payload.name.trim();
  }

  if (payload.unit !== undefined) {
    item.unit = payload.unit.trim();
  }

  if (payload.quantity !== undefined) {
    item.quantity = payload.quantity;
  }

  if (payload.isActive !== undefined) {
    item.isActive = payload.isActive;
  }

  await item.save();

  return item;
};

export const deleteInventoryItem = async (itemId) => {
  const item = await InventoryItem.findById(itemId);

  if (!item) {
    throw new ApiError(404, 'Inventory item not found');
  }

  const linkedProduct = await Product.findOne({ 'recipe.inventoryItem': itemId }).select('name');

  if (linkedProduct) {
    throw new ApiError(400, `Inventory item is used in recipe for ${linkedProduct.name}`);
  }

  await item.deleteOne();
};
