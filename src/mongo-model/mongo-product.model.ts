import { model, Schema } from "mongoose";
import { stockCardSchema } from "./mongo-stock-card.model";

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
  stockCard: {
    type: [stockCardSchema],
    default: [],
  },
});

export const mongoProductModel = model("products", productSchema);
