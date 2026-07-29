import { exec } from "child_process";
import { promisify } from "util";
import { config } from "../config/config";
import { logger } from "../config/winston";

const execAsync = promisify(exec);
const RULE_COMMENT = "powerbi-ip-whitelist";
const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

function assertValidCidr(cidr: string): void {
  if (!CIDR_REGEX.test(cidr)) {
    throw new Error(`Invalid CIDR format: ${cidr}`);
  }
  const [ip, prefix] = cidr.split("/");
  if (ip.split(".").some((o) => Number(o) > 255) || Number(prefix) > 32) {
    throw new Error(`Invalid CIDR values: ${cidr}`);
  }
}

async function ruleExists(cidr: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync("ufw status numbered");
    return (
      stdout.includes(cidr) && stdout.includes(String(config.postgresPort))
    );
  } catch {
    return false;
  }
}

async function addRule(cidr: string): Promise<void> {
  assertValidCidr(cidr);
  const cmd = `ufw route allow proto tcp from ${cidr} to any port ${config.postgresPort} comment '${RULE_COMMENT}'`;
  logger.debug("Running ufw command", { cmd });
  await execAsync(cmd);
}

async function pruneStaleRules(currentCidrs: Set<string>): Promise<string[]> {
  const pruned: string[] = [];
  const { stdout } = await execAsync("ufw status numbered");
  const lines = stdout.split("\n");

  const ruleRegex =
    /\[\s*(\d+)\]\s+.*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d+).*?#\s*powerbi-ip-whitelist/;
  const toDelete: Array<{ num: number; cidr: string }> = [];

  for (const line of lines) {
    const match = line.match(ruleRegex);
    if (match) {
      const [, num, cidr] = match;
      if (!currentCidrs.has(cidr))
        toDelete.push({ num: parseInt(num, 10), cidr });
    }
  }

  for (const { num, cidr } of toDelete.reverse()) {
    assertValidCidr(cidr);
    logger.info("Pruning stale ufw rule", { cidr, ruleNum: num });
    await execAsync(`ufw --force delete ${num}`);
    pruned.push(cidr);
  }

  return pruned;
}

export async function applyWhitelistRules(cidrs: string[]): Promise<{
  added: string[];
  skipped: string[];
  pruned: string[];
  errors: string[];
}> {
  const added: string[] = [];
  const skipped: string[] = [];
  const pruned: string[] = [];
  const errors: string[] = [];

  if (cidrs.length === 0) {
    logger.error("Refusing to apply whitelist: received empty CIDR list");
    return { added, skipped, pruned, errors: ["empty cidr list, aborting"] };
  }

  for (const cidr of cidrs) {
    try {
      assertValidCidr(cidr);
      if (await ruleExists(cidr)) {
        logger.debug("Rule already exists, skipping", { cidr });
        skipped.push(cidr);
      } else {
        logger.info("Adding ufw rule", { cidr, port: config.postgresPort });
        await addRule(cidr);
        added.push(cidr);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to add rule", { cidr, error: msg });
      errors.push(`${cidr}: ${msg}`);
    }
  }

  if (config.pruneStaleRules) {
    try {
      pruned.push(...(await pruneStaleRules(new Set(cidrs))));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to prune stale rules", { error: msg });
      errors.push(`prune: ${msg}`);
    }
  }

  return { added, skipped, pruned, errors };
}
