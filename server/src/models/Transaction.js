import mongoose from 'mongoose';
import { ORDER_TYPE, ORDER_TYPE_VALUES } from '../constants/orderType.js';
import { TRANSACTION_STATUS, TRANSACTION_STATUS_VALUES } from '../constants/transactionStatus.js';

const transactionItemSchema = new mongoose.Schema(
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

const transactionSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true
    },
    orderType: {
      type: String,
      enum: ORDER_TYPE_VALUES,
      default: ORDER_TYPE.DINE_IN,
      required: true
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null
    },
    tableNumber: {
      type: Number,
      default: null
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUS_VALUES,
      default: TRANSACTION_STATUS.PAID
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'cash'
    },
    cancelReason: {
      type: String,
      trim: true,
      default: null
    },
    items: {
      type: [transactionItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    finalizedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

transactionSchema.index({ createdAt: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
