# Claude Max Usage Monitor for OpenClaw

Polls your Claude Max 5-hour / weekly usage every 60 seconds and writes it to
`workspace/claude-usage.json` so your OpenClaw agent always knows how much
quota remains — no headless browser needed.

---

## Prerequisites

1. **Claude Code CLI** installed and authenticated with the **full browser login**:

   ```bash
   claude login          # opens browser — grants user:inference + user:profile
   ```

   > **Do NOT use `claude setup-token`** — it only grants `user:inference` and
   > the usage endpoint will reject it with a 403.

2. **Verify scopes** (should include `user:profile`):

   ```bash
   # Linux
   cat ~/.claude/.credentials.json | jq '.claudeAiOauth.scopes'

   # macOS
   security find-generic-password -s "Claude Code-credentials" -w | jq '.claudeAiOauth.scopes'
   ```

   Expected: `["user:inference", "user:profile"]`
   (may also include `user:mcp_servers`, `user:sessions:claude_code` — that's fine)

3. **jq** installed:

   ```bash
   # macOS
   brew install jq

   # Ubuntu/Debian
   sudo apt install jq
   ```

---

## Installation

### Step 1 — Copy files to your workspace

```bash
# Assuming your OpenClaw workspace is the default location:
WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"

# Create skill directory
mkdir -p "$WORKSPACE/skills/claude-usage-monitor/scripts"

# Copy the files (adjust source path as needed)
cp SKILL.md       "$WORKSPACE/skills/claude-usage-monitor/"
cp scripts/claude-usage-poll.sh "$WORKSPACE/skills/claude-usage-monitor/scripts/"

# Make the script executable
chmod +x "$WORKSPACE/skills/claude-usage-monitor/scripts/claude-usage-poll.sh"
```

### Step 2 — Test the script manually

```bash
# Set output location (optional — defaults to workspace/claude-usage.json)
export CLAUDE_USAGE_OUTPUT="$WORKSPACE/claude-usage.json"

# Run it
bash "$WORKSPACE/skills/claude-usage-monitor/scripts/claude-usage-poll.sh"

# Check the output
cat "$WORKSPACE/claude-usage.json"
```

You should see something like:

```json
{
  "fetched_at": "2026-02-19T10:30:00Z",
  "five_hour": { "utilization_pct": 21, "resets_at": "2026-02-19T15:59:59+00:00" },
  "seven_day": { "utilization_pct": 35, "resets_at": "2026-02-21T03:59:59+00:00" },
  ...
}
```

### Step 3 — Set up the cron job

You have two options:

#### Option A: System cron (recommended for reliability)

```bash
# Edit your crontab
crontab -e

# Add this line (runs every 60 seconds via a loop, since cron minimum is 1 min):
* * * * * CLAUDE_USAGE_OUTPUT="$HOME/.openclaw/workspace/claude-usage.json" /bin/bash "$HOME/.openclaw/workspace/skills/claude-usage-monitor/scripts/claude-usage-poll.sh" >> /tmp/claude-usage-poll.log 2>&1
```

#### Option B: OpenClaw cron

Tell your agent:

> Set up a cron job that runs every minute:
> `bash skills/claude-usage-monitor/scripts/claude-usage-poll.sh`
> Output goes to workspace/claude-usage.json

Or via CLI:

```bash
openclaw cron add \
  --name "claude-usage-poll" \
  --schedule "*/1 * * * *" \
  --command "bash skills/claude-usage-monitor/scripts/claude-usage-poll.sh"
```

### Step 4 — Tell your agent about it

Add this to your **MEMORY.md** (or tell your agent to remember it):

```markdown
## Claude Usage Monitoring

My Claude Max usage stats are available at `workspace/claude-usage.json`.
This file is updated every 60 seconds by a cron job.

Before starting large tasks, read this file to check:
- `five_hour.utilization_pct` — if > 80%, warn me about session cap
- `seven_day.utilization_pct` — if > 90%, warn me about weekly limit
- `resets_at` — when capacity comes back

The file contains: 5-hour session %, 7-day weekly %, Opus-specific %, Sonnet-specific %,
reset timestamps, and a one-line summary.
```

Alternatively, just message your agent:

> Remember: my Claude Max usage stats are always available at
> workspace/claude-usage.json, updated every 60 seconds. Before starting
> big tasks, check that file for my 5-hour and weekly usage percentages.
> If 5hr > 80% or weekly > 90%, warn me.

---

## How it works

1. Reads your Claude Code OAuth credentials from `~/.claude/.credentials.json`
   (or macOS Keychain)
2. Checks if the access token has `user:profile` scope (required for usage API)
3. If the token is expired, automatically refreshes it using the refresh token
   and saves the new credentials back
4. Calls `GET https://api.anthropic.com/api/oauth/usage` with the Bearer token
5. Formats the response and writes it atomically to `claude-usage.json`

### Token lifecycle

- Access tokens expire every ~8 hours
- The script auto-refreshes them using the refresh token
- Refresh tokens are **single-use** — the script saves the new one immediately
- If both tokens expire, you'll need to run `claude login` again

---

## Environment variables

| Variable                 | Default                                  | Description                     |
|--------------------------|------------------------------------------|---------------------------------|
| `CLAUDE_USAGE_OUTPUT`    | `~/.openclaw/workspace/claude-usage.json`| Where to write usage JSON       |
| `CLAUDE_CREDENTIALS_FILE`| `~/.claude/.credentials.json`            | Path to OAuth credentials       |
| `OPENCLAW_WORKSPACE`     | `~/.openclaw/workspace`                  | OpenClaw workspace root         |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Token missing user:profile scope` | Used `claude setup-token` | Run `claude login` instead |
| `Token refresh failed` | Refresh token expired | Run `claude login` to re-auth |
| `No credentials found` | Missing credentials file | Run `claude login` |
| File not updating | Cron not running | Check `crontab -l` or `openclaw cron` |
| `401 Invalid bearer token` | Token expired + refresh failed | Run `claude login` |
