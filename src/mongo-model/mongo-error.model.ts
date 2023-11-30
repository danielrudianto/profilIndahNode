import { model, Schema } from "mongoose";

export const queueErrorSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  error: {
    type: String,
    required: true,
  },
  function: {
    type: String,
    required: true,
  },
});

export const mongoErrorModel = model("queue-error", queueErrorSchema);
