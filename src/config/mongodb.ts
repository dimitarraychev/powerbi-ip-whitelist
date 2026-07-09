import mongoose from "mongoose";
import { config } from "./config";
import { logger } from "./winston";

const MONGO_URI = `mongodb://${config.mongoHost}:${config.mongoPort}/${config.mongoDb}`;

const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info("✅ MongoDB connected", {
      host: config.mongoHost,
      port: config.mongoPort,
      db: config.mongoDb,
    });
  } catch (err) {
    logger.error("❌ MongoDB connection failed", { error: err });
    process.exit(1);
  }
};

export default connectMongoDB;
