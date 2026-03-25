import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';

export const listInventoryItems = async () => {
  return Product.find({ trackInventory: true, isActive: true })
    .select('name imageDataUrl inventoryQuantity inventoryUnit isActive')
    .sort({ name: 1 });
};

export const restockInventoryItem = async ({ productId, quantity, unit }) => {
  if (!productId) {
    throw new ApiError(400, 'Tracked product is required');
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(400, 'Restock quantity must be greater than zero');
  }

  if (!['pcs', 'gr', 'ml'].includes(unit)) {
    throw new ApiError(400, 'Inventory unit must be pcs, gr, or ml');
  }

  const product = await Product.findById(productId);

  if (!product || !product.trackInventory) {
    throw new ApiError(404, 'Tracked product not found');
  }

  product.inventoryQuantity = (product.inventoryQuantity ?? 0) + quantity;
  product.inventoryUnit = unit;
  await product.save();

  return product;
};
