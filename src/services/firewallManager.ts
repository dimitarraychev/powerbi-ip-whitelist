import { exec } from "child_process";
import { promisify } from "util";
import { config } from "../config/config";
import { logger } from "../config/winston";

const execAsync = promisify(exec);
const RULE_COMMENT = "powerbi-ip-whitelister";

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
  const cmd = `ufw allow from ${cidr} to any port ${config.postgresPort} proto tcp comment '${RULE_COMMENT}'`;
  logger.debug("Running ufw command", { cmd });
  await execAsync(cmd);
}

async function pruneStaleRules(currentCidrs: Set<string>): Promise<string[]> {
  const pruned: string[] = [];
  const { stdout } = await execAsync("ufw status numbered");
  const lines = stdout.split("\n");

  const ruleRegex =
    /\[\s*(\d+)\]\s+.*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d+).*?#\s*powerbi-ip-whitelister/;
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
    logger.info("Pruning stale ufw rule", { cidr, ruleNum: num });
    await execAsync(`echo "y" | ufw delete ${num}`);
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

  for (const cidr of cidrs) {
    try {
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
