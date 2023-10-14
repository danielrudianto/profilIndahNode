import { model, Schema } from "mongoose";

export const overflowSchema = new Schema({
  itemID: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  document: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
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
  value: {
    type: Number,
    required: true,
    default: 0,
  },
});

export const mongoOverflowModel = model("overflows", overflowSchema);
