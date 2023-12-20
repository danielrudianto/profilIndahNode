import { model, Schema } from "mongoose";

const productSchema = new Schema({
  reference: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  itemID: {
    type: Number,
    required: true,
    unique: true,
  },
  itemTypeID: {
    type: Number,
    required: true,
  },
  itemBrandID: {
    type: Number,
    required: true,
  },
  currentStock: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  minimumStock: {
    type: Number,
    default: 0,
    required: true,
  },
  calculatedMinimumStock: {
    type: Number,
    default: 0,
    required: true,
  },
});

export const mongoProductModel = model("products", productSchema);
