import mongoose from "mongoose";

export async function connectDatabase() {
  const databaseUri = process.env.MONGODB_URI;

  if (!databaseUri) {
    throw new Error(
      "MONGODB_URI is not defined in the environment."
    );
  }

  await mongoose.connect(databaseUri);

  console.log("MongoDB connected successfully.");
}