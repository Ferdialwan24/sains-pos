import mongoose from 'mongoose';

const recipeItemSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    recipe: {
      type: [recipeItemSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

productSchema.index({ name: 1 }, { unique: true });

export const Product = mongoose.model('Product', productSchema);

