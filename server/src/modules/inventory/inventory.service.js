import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import { getStockAlert } from '../../utils/stockAlert.js';

export const listInventoryItems = async () => {
  const items = await Product.find({ trackInventory: true, isActive: true })
    .select('name imageDataUrl inventoryQuantity inventoryUnit isActive lowStockThreshold trackInventory')
    .sort({ name: 1 });

  return items.map((item) => {
    const payload = item.toObject();

    return {
      ...payload,
      stockAlert: getStockAlert(payload)
    };
  });
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
