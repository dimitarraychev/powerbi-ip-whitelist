import { config } from "./config/config";
import connectMongoDB from "./config/mongodb";
import { logger } from "./config/winston";
import { startScheduler } from "./scheduler";
import { runWhitelist } from "./services/whitelistService";

async function main(): Promise<void> {
  await connectMongoDB();

  logger.info("Starting powerbi-ip-whitelist", {
    serviceTags: config.serviceTags,
    cronSchedule: config.cronSchedule,
    postgresPort: config.postgresPort,
  });

  startScheduler();

  logger.info("Running initial whitelist sync on startup...");
  try {
    await runWhitelist();
  } catch (err) {
    logger.error("Initial sync failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

main();
