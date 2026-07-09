import winston from "winston";
import "winston-mongodb";
import { config } from "./config";

const MONGO_URI = `mongodb://${config.mongoHost}:${config.mongoPort}/${config.mongoDb}`;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const mongoTransport = new winston.transports.MongoDB({
  db: MONGO_URI,
  collection: "logs",
  tryReconnect: true,
  level: "info",
  format: logFormat,
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    mongoTransport,
  ],
});
