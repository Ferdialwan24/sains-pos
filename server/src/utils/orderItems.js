import { Product } from '../models/Product.js';
import { ApiError } from './ApiError.js';

export const buildOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'At least one product item is required');
  }

  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new ApiError(400, 'Product quantity must be greater than zero');
    }

    return {
      product: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity
    };
  });
};

export const calculateSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.lineTotal, 0);

const getRequiredInventory = async (orderItems) => {
  const productIds = orderItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const usageMap = new Map();

  for (const orderItem of orderItems) {
    const product = productMap.get(String(orderItem.product));

    if (!product) {
      throw new ApiError(404, `Product not found during checkout: ${orderItem.product}`);
    }

    if (!product.trackInventory) {
      continue;
    }

    const key = String(product.id);
    const currentQuantity = usageMap.get(key) ?? 0;
    usageMap.set(key, currentQuantity + orderItem.quantity);
  }

  for (const [productId, requiredQuantity] of usageMap.entries()) {
    const product = productMap.get(productId);

    if (!product) {
      throw new ApiError(404, `Product not found: ${productId}`);
    }

    if ((product.inventoryQuantity ?? 0) < requiredQuantity) {
      throw new ApiError(409, `Insufficient stock for ${product.name}`);
    }
  }

  return usageMap;
};

export const applyInventoryUsage = async (orderItems) => {
  const requiredInventory = await getRequiredInventory(orderItems);

  for (const [productId, requiredQuantity] of requiredInventory.entries()) {
    await Product.findByIdAndUpdate(productId, {
      $inc: {
        inventoryQuantity: -requiredQuantity
      }
    });
  }
};
