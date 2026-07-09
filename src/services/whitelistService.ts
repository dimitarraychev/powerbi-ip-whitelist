import { fetchPowerBiIps } from "./ipFetcher";
import { applyWhitelistRules } from "./firewallManager";
import { logger } from "../config/winston";
import { WhitelistResult } from "../types";

export async function runWhitelist(): Promise<WhitelistResult[]> {
  logger.info("Starting whitelist sync...");

  const tagMap = await fetchPowerBiIps();
  const results: WhitelistResult[] = [];

  for (const [tag, { changeNumber, prefixes }] of tagMap.entries()) {
    logger.info(`Applying rules for ${tag}`, { count: prefixes.length });

    const { added, skipped, pruned, errors } =
      await applyWhitelistRules(prefixes);

    const result: WhitelistResult = {
      tag,
      changeNumber,
      totalIps: prefixes.length,
      added,
      skipped,
      pruned,
      errors,
    };

    results.push(result);

    logger.info(`Done with ${tag}`, {
      added: added.length,
      skipped: skipped.length,
      pruned: pruned.length,
      errors: errors.length,
    });
  }

  logger.info("Whitelist sync complete");
  return results;
}
