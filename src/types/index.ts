export interface ServiceTagEntry {
  name: string;
  id: string;
  properties: {
    changeNumber: number;
    region: string;
    platform: string;
    systemService: string;
    addressPrefixes: string[];
  };
}

export interface ServiceTagsFile {
  changeNumber: number;
  cloud: string;
  values: ServiceTagEntry[];
}

export interface WhitelistResult {
  tag: string;
  changeNumber: number;
  totalIps: number;
  added: string[];
  skipped: string[];
  pruned: string[];
  errors: string[];
}
