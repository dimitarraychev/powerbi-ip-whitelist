import mongoose from "mongoose";
import { initMongoLogging, logger } from "./winston.js";

const DB_PORT = process.env.MONGO_DB_PORT || 27017;
const DB_HOST = process.env.MONGO_DB_HOST || "localhost";
const DB_USER = process.env.MONGO_DB_USERNAME;
const DB_PASSWORD = process.env.MONGO_DB_PASSWORD;
const DB_TABLE = process.env.MONGO_DB_TABLE;
const MONGO_URI = `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_TABLE}?authSource=admin`;

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    initMongoLogging();
    logger.info("✅ MongoDB connected", { port: DB_PORT });
  } catch (err) {
    logger.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

export default connectDB;
