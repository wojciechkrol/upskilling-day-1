import mongoose, { Schema } from "mongoose";

const MONGO_URL = process.env.MONGO_URL as string;

mongoose.connect(MONGO_URL);

export const Video =
  mongoose.models.Video ??
  mongoose.model(
    "Video",
    new Schema({
      status: String,
      createdAt: Date,
    })
  );
