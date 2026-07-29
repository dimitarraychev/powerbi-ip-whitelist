export const config = {
  serviceTags: (process.env.POWERBI_SERVICE_TAGS ?? "PowerBI.WestEurope")
    .split(",")
    .map((t) => t.trim()),
  postgresPort: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
  microsoftDownloadId: process.env.MICROSOFT_DOWNLOAD_ID ?? "56519",
  cronSchedule: process.env.CRON_SCHEDULE ?? "0 6 * * 1",
  logLevel: process.env.LOG_LEVEL ?? "info",

  mongoHost: process.env.MONGO_DB_HOST ?? "localhost",
  mongoPort: parseInt(process.env.MONGO_DB_PORT ?? "27017", 10),
  mongoDb: process.env.MONGO_DB_TABLE ?? "powerbi-ip-whitelist",

  pruneStaleRules: process.env.PRUNE_STALE_RULES === "true",
};
