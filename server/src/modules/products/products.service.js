import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import { getStockAlert } from '../../utils/stockAlert.js';

const INVENTORY_UNITS = new Set(['pcs', 'gr', 'ml']);
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const getBase64SizeInBytes = (dataUrl) => {
  const base64Value = dataUrl.split(',')[1] ?? '';
  const paddingLength = base64Value.endsWith('==') ? 2 : base64Value.endsWith('=') ? 1 : 0;

  return Math.ceil((base64Value.length * 3) / 4) - paddingLength;
};

const normalizeImageDataUrl = (imageDataUrl) => {
  if (imageDataUrl === undefined) {
    return undefined;
  }

  if (imageDataUrl === null || imageDataUrl === '') {
    return null;
  }

  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    throw new ApiError(400, 'Product image must be a valid image upload');
  }

  if (getBase64SizeInBytes(imageDataUrl) > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new ApiError(400, 'Product image must be 5 MB or smaller');
  }

  return imageDataUrl;
};

const normalizeInventoryUnit = (inventoryUnit) => {
  if (inventoryUnit === undefined) {
    return undefined;
  }

  if (!inventoryUnit) {
    return 'pcs';
  }

  if (!INVENTORY_UNITS.has(inventoryUnit)) {
    throw new ApiError(400, 'Inventory unit must be pcs, gr, or ml');
  }

  return inventoryUnit;
};

const normalizeCategoryId = async (categoryId) => {
  if (categoryId === undefined) {
    return undefined;
  }

  if (categoryId === null || categoryId === '') {
    return null;
  }

  const category = await Category.findById(categoryId).select('name');

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category._id;
};

const toProductPayload = (productDocument) => {
  const product = productDocument.toObject();
  const inventoryQuantity = product.trackInventory ? product.inventoryQuantity ?? 0 : null;
  const maxOrderQuantity = product.trackInventory ? Math.floor(inventoryQuantity) : null;
  const stockAlert = getStockAlert(product);

  return {
    ...product,
    category: product.category
      ? {
          _id: product.category._id,
          name: product.category.name
        }
      : null,
    availability: {
      isAvailable: product.trackInventory ? inventoryQuantity > 0 : true,
      maxOrderQuantity,
      reason: product.trackInventory && inventoryQuantity <= 0 ? `Out of stock: ${product.name}` : null
    },
    stockAlert
  };
};

export const listProducts = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  const products = await Product.find(filter)
    .populate('category', 'name')
    .sort({ createdAt: 1, _id: 1 });

  return products.map(toProductPayload);
};

export const createProduct = async ({
  name,
  price,
  categoryId,
  imageDataUrl,
  trackInventory = false,
  inventoryQuantity = 0,
  inventoryUnit = 'pcs',
  lowStockThreshold = 0
}) => {
  if (!name?.trim()) {
    throw new ApiError(400, 'Product name is required');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new ApiError(400, 'Product price must be zero or greater');
  }

  if (trackInventory && (!Number.isFinite(inventoryQuantity) || inventoryQuantity < 0)) {
    throw new ApiError(400, 'Tracked inventory quantity must be zero or greater');
  }

  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    throw new ApiError(400, 'Low stock threshold must be zero or greater');
  }

  if (trackInventory && lowStockThreshold <= 0) {
    throw new ApiError(400, 'Low stock threshold is required when inventory tracking is active');
  }

  const category = await normalizeCategoryId(categoryId);

  const product = await Product.create({
    name: name.trim(),
    price,
    category,
    imageDataUrl: normalizeImageDataUrl(imageDataUrl) ?? null,
    trackInventory: Boolean(trackInventory),
    inventoryQuantity: trackInventory ? inventoryQuantity : 0,
    inventoryUnit: normalizeInventoryUnit(inventoryUnit) ?? 'pcs',
    lowStockThreshold
  });

  await product.populate('category', 'name');

  return product;
};

export const updateProduct = async (productId, payload) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const nextTrackInventory = payload.trackInventory !== undefined ? Boolean(payload.trackInventory) : product.trackInventory;
  const nextLowStockThreshold =
    payload.lowStockThreshold !== undefined ? payload.lowStockThreshold : product.lowStockThreshold ?? 0;

  if (payload.name !== undefined) {
    if (!payload.name?.trim()) {
      throw new ApiError(400, 'Product name is required');
    }

    product.name = payload.name.trim();
  }

  if (payload.price !== undefined) {
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      throw new ApiError(400, 'Product price must be zero or greater');
    }

    product.price = payload.price;
  }

  const normalizedCategoryId = await normalizeCategoryId(payload.categoryId);

  if (normalizedCategoryId !== undefined) {
    product.category = normalizedCategoryId;
  }

  const normalizedImageDataUrl = normalizeImageDataUrl(payload.imageDataUrl);

  if (normalizedImageDataUrl !== undefined) {
    product.imageDataUrl = normalizedImageDataUrl;
  }

  if (payload.trackInventory !== undefined) {
    product.trackInventory = Boolean(payload.trackInventory);
  }

  if (payload.inventoryQuantity !== undefined) {
    if (!Number.isFinite(payload.inventoryQuantity) || payload.inventoryQuantity < 0) {
      throw new ApiError(400, 'Tracked inventory quantity must be zero or greater');
    }

    product.inventoryQuantity = payload.inventoryQuantity;
  }

  if (payload.lowStockThreshold !== undefined) {
    if (!Number.isFinite(payload.lowStockThreshold) || payload.lowStockThreshold < 0) {
      throw new ApiError(400, 'Low stock threshold must be zero or greater');
    }

    product.lowStockThreshold = payload.lowStockThreshold;
  }

  if (nextTrackInventory && nextLowStockThreshold <= 0) {
    throw new ApiError(400, 'Low stock threshold is required when inventory tracking is active');
  }

  const normalizedInventoryUnit = normalizeInventoryUnit(payload.inventoryUnit);

  if (normalizedInventoryUnit !== undefined) {
    product.inventoryUnit = normalizedInventoryUnit;
  }

  if (payload.isActive !== undefined) {
    product.isActive = payload.isActive;
  }

  if (!product.trackInventory) {
    product.inventoryQuantity = 0;
  }

  await product.save();
  await product.populate('category', 'name');

  return product;
};

export const deleteProduct = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await product.deleteOne();
};
