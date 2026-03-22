import mongoose from 'mongoose';
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
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true
    },
    tableNumber: {
      type: Number,
      required: true
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

