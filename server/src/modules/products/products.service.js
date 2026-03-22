import { InventoryItem } from '../../models/InventoryItem.js';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';

const normalizeRecipe = async (recipe = []) => {
  if (!Array.isArray(recipe)) {
    throw new ApiError(400, 'Recipe must be an array');
  }

  if (recipe.length === 0) {
    return [];
  }

  const inventoryIds = recipe.map((item) => item.inventoryItem);
  const inventoryItems = await InventoryItem.find({ _id: { $in: inventoryIds }, isActive: true });
  const inventoryMap = new Map(inventoryItems.map((item) => [item.id, item]));

  return recipe.map((item) => {
    if (!inventoryMap.has(String(item.inventoryItem))) {
      throw new ApiError(404, `Inventory item not found: ${item.inventoryItem}`);
    }

    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      throw new ApiError(400, 'Recipe quantity must be zero or greater');
    }

    return {
      inventoryItem: item.inventoryItem,
      quantity: item.quantity
    };
  });
};

const attachAvailability = async (products) => {
  const inventoryIds = [
    ...new Set(
      products.flatMap((product) =>
        (product.recipe ?? []).map((recipeItem) => String(recipeItem.inventoryItem?._id ?? recipeItem.inventoryItem))
      )
    )
  ];

  if (inventoryIds.length === 0) {
    return products.map((product) => ({
      ...product.toObject(),
      availability: {
        isAvailable: true,
        maxOrderQuantity: null,
        reason: null
      }
    }));
  }

  const inventoryItems = await InventoryItem.find({ _id: { $in: inventoryIds } });
  const inventoryMap = new Map(inventoryItems.map((item) => [item.id, item]));

  return products.map((productDocument) => {
    const product = productDocument.toObject();

    if (!product.recipe?.length) {
      return {
        ...product,
        availability: {
          isAvailable: true,
          maxOrderQuantity: null,
          reason: null
        }
      };
    }

    let maxOrderQuantity = Number.POSITIVE_INFINITY;
    let reason = null;

    for (const recipeItem of product.recipe) {
      const inventoryId = String(recipeItem.inventoryItem?._id ?? recipeItem.inventoryItem);
      const inventoryItem = inventoryMap.get(inventoryId);

      if (!inventoryItem) {
        maxOrderQuantity = 0;
        reason = 'Missing inventory item';
        break;
      }

      if (recipeItem.quantity <= 0) {
        continue;
      }

      const producibleQuantity = Math.floor(inventoryItem.quantity / recipeItem.quantity);
      maxOrderQuantity = Math.min(maxOrderQuantity, producibleQuantity);

      if (producibleQuantity <= 0 && !reason) {
        reason = `Out of stock: ${inventoryItem.name}`;
      }
    }

    if (maxOrderQuantity === Number.POSITIVE_INFINITY) {
      maxOrderQuantity = null;
    }

    return {
      ...product,
      availability: {
        isAvailable: maxOrderQuantity === null ? true : maxOrderQuantity > 0,
        maxOrderQuantity,
        reason
      }
    };
  });
};

export const listProducts = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  const products = await Product.find(filter).populate('recipe.inventoryItem', 'name unit quantity').sort({ name: 1 });

  return attachAvailability(products);
};

export const createProduct = async ({ name, category = 'General', price, recipe = [] }) => {
  if (!name?.trim()) {
    throw new ApiError(400, 'Product name is required');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new ApiError(400, 'Product price must be zero or greater');
  }

  const normalizedRecipe = await normalizeRecipe(recipe);

  return Product.create({
    name: name.trim(),
    category: category.trim(),
    price,
    recipe: normalizedRecipe
  });
};

export const updateProduct = async (productId, payload) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (payload.name !== undefined) {
    product.name = payload.name.trim();
  }

  if (payload.category !== undefined) {
    product.category = payload.category.trim();
  }

  if (payload.price !== undefined) {
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      throw new ApiError(400, 'Product price must be zero or greater');
    }

    product.price = payload.price;
  }

  if (payload.recipe !== undefined) {
    product.recipe = await normalizeRecipe(payload.recipe);
  }

  if (payload.isActive !== undefined) {
    product.isActive = payload.isActive;
  }

  await product.save();

  return Product.findById(product.id).populate('recipe.inventoryItem', 'name unit');
};

export const deleteProduct = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await product.deleteOne();
};
