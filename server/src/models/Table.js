import mongoose from 'mongoose';
import { TABLE_STATUS, TABLE_STATUS_VALUES } from '../constants/tableStatus.js';

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
    customerName: {
      type: String,
      trim: true,
      required: true
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
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    openedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const tableSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
      min: 1
    },
    status: {
      type: String,
      enum: TABLE_STATUS_VALUES,
      default: TABLE_STATUS.AVAILABLE
    },
    activeOrder: {
      type: activeOrderSchema,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Table = mongoose.model('Table', tableSchema);

