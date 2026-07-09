import cron from "node-cron";
import { config } from "./config/config";
import { logger } from "./config/winston";
import { runWhitelist } from "./services/whitelistService";

export function startScheduler(): void {
  if (!cron.validate(config.cronSchedule)) {
    throw new Error(`Invalid cron schedule: "${config.cronSchedule}"`);
  }

  logger.info("Scheduler started", { schedule: config.cronSchedule });

  cron.schedule(config.cronSchedule, async () => {
    logger.info("Cron triggered — running scheduled whitelist sync");
    try {
      await runWhitelist();
    } catch (err) {
      logger.error("Scheduled sync failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
