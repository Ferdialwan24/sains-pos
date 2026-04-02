import mongoose from 'mongoose';
import { ACTIVE_ORDER_STATUS, ACTIVE_ORDER_STATUS_VALUES } from '../constants/activeOrderStatus.js';
import { ORDER_TYPE_VALUES } from '../constants/orderType.js';

const activeOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const activeOrderSchema = new mongoose.Schema(
  {
    orderType: {
      type: String,
      enum: ORDER_TYPE_VALUES,
      required: true
    },
    status: {
      type: String,
      enum: ACTIVE_ORDER_STATUS_VALUES,
      default: ACTIVE_ORDER_STATUS.ACTIVE
    },
    customerName: {
      type: String,
      trim: true,
      required: true
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null
    },
    tableNumber: {
      type: Number,
      default: null,
      min: 1
    },
    items: {
      type: [activeOrderItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

activeOrderSchema.index({ status: 1, orderType: 1, updatedAt: -1 });
activeOrderSchema.index({ table: 1 }, { sparse: true });

export const ActiveOrder = mongoose.model('ActiveOrder', activeOrderSchema);
