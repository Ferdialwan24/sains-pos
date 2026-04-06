import mongoose from 'mongoose';
import { TABLE_STATUS, TABLE_STATUS_VALUES } from '../constants/tableStatus.js';

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
    activeOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActiveOrder',
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Table = mongoose.model('Table', tableSchema);
