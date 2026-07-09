import axios from "axios";
import * as cheerio from "cheerio";
import { config } from "../config/config";
import { logger } from "../config/winston";
import { ServiceTagEntry, ServiceTagsFile } from "../types";

const DOWNLOAD_PAGE = `https://www.microsoft.com/en-us/download/confirmation.aspx?id=${config.microsoftDownloadId}`;

/**
 * Scrapes the Microsoft download confirmation page to find the direct
 * download URL for the Azure IP Ranges JSON file (updated weekly by MS).
 */
async function resolveDownloadUrl(): Promise<string> {
  logger.info("Fetching Microsoft download page to resolve JSON URL...");

  const { data: html } = await axios.get<string>(DOWNLOAD_PAGE, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; powerbi-ip-whitelister/1.0)",
    },
    timeout: 15_000,
  });

  const $ = cheerio.load(html);

  // Microsoft embeds the direct link in an anchor with class "failoverLink"
  // or in a meta refresh / direct download link
  let downloadUrl: string | undefined;

  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.includes("download.microsoft.com") && href.endsWith(".json")) {
      downloadUrl = href;
      return false; // break
    }
  });

  // Fallback: look for it in meta tags
  if (!downloadUrl) {
    $('meta[http-equiv="refresh"]').each((_, el) => {
      const content = $(el).attr("content") ?? "";
      const match = content.match(/url=(.+\.json)/i);
      if (match) downloadUrl = match[1];
    });
  }

  if (!downloadUrl) {
    throw new Error("Could not locate JSON download URL on Microsoft page");
  }

  logger.info("Resolved download URL", { url: downloadUrl });
  return downloadUrl;
}

/**
 * Downloads the Azure IP Ranges JSON and returns the full parsed object.
 */
async function downloadServiceTags(url: string): Promise<ServiceTagsFile> {
  logger.info("Downloading service tags JSON...");

  const { data } = await axios.get<ServiceTagsFile>(url, {
    timeout: 30_000,
    responseType: "json",
  });

  logger.info("Downloaded service tags", {
    changeNumber: data.changeNumber,
    totalEntries: data.values.length,
  });
  return data;
}

/**
 * Fetches IPv4 prefixes for the configured service tags.
 * Returns a map of tagName -> { changeNumber, prefixes[] }
 */
export async function fetchPowerBiIps(): Promise<
  Map<string, { changeNumber: number; prefixes: string[] }>
> {
  const url = await resolveDownloadUrl();
  const file = await downloadServiceTags(url);

  const result = new Map<
    string,
    { changeNumber: number; prefixes: string[] }
  >();

  for (const tag of config.serviceTags) {
    const entry: ServiceTagEntry | undefined = file.values.find(
      (v) => v.name.toLowerCase() === tag.toLowerCase(),
    );

    if (!entry) {
      logger.warn("Service tag not found in downloaded file", { tag });
      continue;
    }

    // Filter out IPv6 (CIDR with colons)
    const ipv4Prefixes = entry.properties.addressPrefixes.filter(
      (p) => !p.includes(":"),
    );

    logger.info("Found IPs for tag", {
      tag,
      changeNumber: entry.properties.changeNumber,
      ipv4Count: ipv4Prefixes.length,
    });

    result.set(tag, {
      changeNumber: entry.properties.changeNumber,
      prefixes: ipv4Prefixes,
    });
  }

  return result;
}
