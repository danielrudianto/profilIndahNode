import { model, Schema } from "mongoose";

const stockOutSchema = new Schema({
  billID: {
    type: Number,
    required: false,
    default: null,
  },
  billCodeID: {
    type: Number,
    required: false,
    default: null,
  },
  adjustmentCaseID: {
    type: Number,
    required: false,
    default: null,
  },
  adjustmentCaseCodeID: {
    type: Number,
    required: false,
    default: null,
  },
  date: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  quantity: {
    type: Number,
    required: true,
  },
  value: {
    type: Number,
    required: true,
    default: 0,
  },
});

const StockInSchema = new Schema({
  companyID: {
    type: Number,
    required: true,
  },
  adjustmentCaseID: {
    type: Number,
    required: false,
    default: null,
  },
  adjustmentCaseCodeID: {
    type: Number,
    required: false,
    default: null,
  },
  goodReceiptID: {
    type: Number,
    required: false,
    default: null,
  },
  goodReceiptCodeID: {
    type: Number,
    required: false,
    default: null,
  },
  date: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  residue: {
    type: Number,
    required: true,
  },
  itemID: {
    type: Number,
    required: true,
  },
  stockOut: {
    type: [stockOutSchema],
    default: [],
  },
});

export const mongoStockInModel = model("stock-ins", StockInSchema);
