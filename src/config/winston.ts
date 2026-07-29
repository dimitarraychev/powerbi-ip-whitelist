import winston from "winston";
import "winston-mongodb";
import mongoose from "mongoose";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

export const initMongoLogging = () => {
  const dbPromise = mongoose.connection
    .asPromise()
    .then((conn) => conn.getClient());

  const mongoTransport = new winston.transports.MongoDB({
    db: dbPromise,
    collection: "logs",
    level: "info",
    format: logFormat,
    storeHost: true,
  });

  mongoTransport.on("error", (err) => {
    console.error("❌ Winston MongoDB Transport Error:", err);
  });

  logger.add(mongoTransport);
};
