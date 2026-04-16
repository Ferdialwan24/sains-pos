import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';

const normalizeCategoryName = (name) => {
  if (!name?.trim()) {
    throw new ApiError(400, 'Category name is required');
  }

  return name.trim().replace(/\s+/g, ' ');
};

const toCategoryPayload = (category) => ({
  _id: category._id,
  name: category.name
});

export const listCategories = async () => {
  const categories = await Category.find().sort({ name: 1 });
  return categories.map(toCategoryPayload);
};

export const createCategory = async ({ name }) => {
  const normalizedName = normalizeCategoryName(name);
  const normalizedKey = normalizedName.toLowerCase();

  const existingCategory = await Category.findOne({ normalizedName: normalizedKey });

  if (existingCategory) {
    throw new ApiError(409, 'Category already exists');
  }

  const category = await Category.create({
    name: normalizedName,
    normalizedName: normalizedKey
  });

  return toCategoryPayload(category);
};

export const updateCategory = async (categoryId, { name }) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const normalizedName = normalizeCategoryName(name);
  const normalizedKey = normalizedName.toLowerCase();

  const existingCategory = await Category.findOne({
    normalizedName: normalizedKey,
    _id: { $ne: categoryId }
  });

  if (existingCategory) {
    throw new ApiError(409, 'Category already exists');
  }

  category.name = normalizedName;
  category.normalizedName = normalizedKey;
  await category.save();

  return toCategoryPayload(category);
};

export const deleteCategory = async (categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  await Product.updateMany({ category: category._id }, { $set: { category: null } });
  await category.deleteOne();
};
