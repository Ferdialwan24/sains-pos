import mongoose from 'mongoose';

const invoiceSequenceSchema = new mongoose.Schema(
  {
    monthKey: {
      type: String,
      required: true,
      unique: true
    },
    lastSequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const InvoiceSequence = mongoose.model('InvoiceSequence', invoiceSequenceSchema);
