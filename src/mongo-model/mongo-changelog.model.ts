import { model, Schema } from "mongoose";

export const changelogSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  changes: {
    type: Array,
    required: true,
  },
});

export const mongoChangelogModel = model("changelogs", changelogSchema);
