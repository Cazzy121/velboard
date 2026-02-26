---
name: claude-usage-monitor
description: >
  Monitors Claude Max subscription usage (5-hour session window, 7-day weekly window,
  per-model caps) by polling the Anthropic OAuth usage API every 60 seconds.
  Results are written to workspace/claude-usage.json. Read this file before
  starting large tasks to check remaining quota.
---

# Claude Usage Monitor

This skill keeps a live snapshot of your Claude Max plan usage at:

    workspace/claude-usage.json

The file is updated every 60 seconds by a cron job running `scripts/claude-usage-poll.sh`.

## What it tracks

| Field               | Meaning                                      |
|---------------------|----------------------------------------------|
| `five_hour`         | Current 5-hour rolling session window usage % |
| `seven_day`         | 7-day rolling weekly usage % (all models)     |
| `seven_day_opus`    | Weekly Opus-specific cap usage %              |
| `seven_day_sonnet`  | Weekly Sonnet-specific cap usage %            |
| `fetched_at`        | UTC timestamp of last successful poll         |
| `summary`           | One-line human-readable summary               |

## How to use this information

Before starting a large or multi-turn task, read `workspace/claude-usage.json`:

```bash
cat workspace/claude-usage.json
```

- If `five_hour.utilization_pct` > 80: warn the user they may hit the session cap soon.
- If `seven_day.utilization_pct` > 90: warn the user they are close to the weekly limit.
- Check `resets_at` timestamps to know when capacity returns.

## Example output

```json
{
  "fetched_at": "2026-02-19T10:30:00Z",
  "five_hour": { "utilization_pct": 21, "resets_at": "2026-02-19T15:59:59+00:00" },
  "seven_day": { "utilization_pct": 35, "resets_at": "2026-02-21T03:59:59+00:00" },
  "seven_day_opus": { "utilization_pct": 12, "resets_at": null },
  "seven_day_sonnet": { "utilization_pct": 29, "resets_at": "2026-02-21T07:00:00+00:00" },
  "summary": "5hr: 21% | 7day: 35% | Opus: 12% | Sonnet: 29%"
}
```

## Requirements

- Claude Code CLI authenticated via `claude login` (NOT `claude setup-token`)
- The token must have `user:profile` scope (granted by `claude login`)
- `jq` installed
- `curl` installed

## Troubleshooting

- **"Token missing user:profile scope"**: You used `claude setup-token`. Fix: run `claude login`.
- **"Access token expired"**: The script auto-refreshes. If it fails, run `claude login` again.
- **File not updating**: Check cron logs — `openclaw cron` or system cron output.
