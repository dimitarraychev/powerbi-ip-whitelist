# powerbi-ip-whitelist

A lightweight microservice that automatically keeps your Linux firewall up to date with Microsoft's published Power BI IP ranges, so your self-hosted PostgreSQL always accepts connections from Power BI.

## How it works

1. On startup (and on cron schedule), fetches the latest Azure IP Ranges JSON from Microsoft
2. Filters to the configured Power BI service tag(s) (e.g. `PowerBI.WestEurope`)
3. Adds any missing IPv4 `ufw` / `iptables` rules for port 5432
4. Exposes a small REST API for health checks and manual triggers

Microsoft publishes IP range updates every Monday, so the default cron runs Monday at 06:00 UTC.

## Quick start

```bash
# 1. Clone / copy the project onto your VM
cp .env.example .env
# Edit .env if needed (change region tag, port, etc.)

# 2. Build and start
docker compose up -d

# 3. Check logs
docker compose logs -f

# 4. Manually trigger a sync (optional)
curl -X POST http://localhost:3000/refresh

# 5. Check status
curl http://localhost:3000/status
```

## API endpoints

| Method | Path       | Description                               |
| ------ | ---------- | ----------------------------------------- |
| GET    | `/health`  | Liveness probe                            |
| GET    | `/status`  | Last run info, next scheduled run, config |
| POST   | `/refresh` | Manually trigger a whitelist sync         |

## Configuration

All config is via environment variables (see `.env.example`).

| Variable               | Default              | Description                         |
| ---------------------- | -------------------- | ----------------------------------- |
| `POWERBI_SERVICE_TAGS` | `PowerBI.WestEurope` | Comma-separated service tags        |
| `FIREWALL_BACKEND`     | `ufw`                | `ufw` or `iptables`                 |
| `POSTGRES_PORT`        | `5432`               | Port to open rules on               |
| `CRON_SCHEDULE`        | `0 6 * * 1`          | Cron expression for auto-sync       |
| `PRUNE_STALE_RULES`    | `false`              | Remove IPs no longer in MS list     |
| `HTTP_PORT`            | `3000`               | Management API port                 |
| `LOG_LEVEL`            | `info`               | `debug` / `info` / `warn` / `error` |

## Why `privileged: true`?

The container needs to call `ufw` or `iptables` on the **host** network stack. `network_mode: host` + `privileged: true` gives it access. This is intentional and the minimum required for this use case.

## Finding your service tag

Your Power BI cluster region is shown in the error URL when refresh fails:
`wabi-west-europe-...` → `PowerBI.WestEurope`
`wabi-east-us-...` → `PowerBI.EastUS`

Download the full list: https://www.microsoft.com/en-us/download/details.aspx?id=56519
