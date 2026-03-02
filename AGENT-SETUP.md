# ⚡ Velboard — Agent Setup Guide

**For AI agents:** Step-by-step instructions to add Velboard monitoring panels to a Vel dashboard.

---

> ## ⚠️ Prerequisites
>
> **Complete the [Vel Framework Setup](https://github.com/essdee/vel/blob/main/AGENT-SETUP.md) first.**
>
> Follow that guide through **Step 5 (test locally)** — it covers Go installation, cloning Vel, creating `config.json`, setting up `.env`, systemd, reverse proxy, and Telegram bot setup.
>
> **Come back here after your Vel instance is running.**

---

## Step 0 — Ask the user

Before starting, ask:

1. **Claude Max?** — Do they use Claude CLI with a Max subscription? (for the usage panel)
2. **Which panels?** — Default panel order: `["claude-usage", "cpu", "memory", "disk", "uptime", "processes", "openclaw-status", "sessions", "crons", "models"]`

---

## Step 1 — Install Velboard

```bash
cd <install-dir>/apps/
git clone https://github.com/karthikeyan5/velboard.git
```

Rebuild Vel to include Velboard:

```bash
cd <install-dir>
./vel build
```

Verify panels are discovered:

```bash
cd <install-dir>
./vel
# Look for "App Report" showing velboard with panels loaded
```

---

## Step 2 — Configure panels

Update `config.json` to set the panel order:

```json
{
  "panels": {
    "order": ["claude-usage", "cpu", "memory", "disk", "uptime", "processes", "openclaw-status", "sessions", "crons", "models"],
    "disabled": []
  }
}
```

**Important:** The OpenClaw panels (status, crons, models) need `openclaw` CLI in the service's PATH. Either add it to the systemd `Environment=PATH=...` or create a symlink:

```bash
sudo ln -sf $(which openclaw) /usr/local/bin/openclaw
```

---

## Step 3 — Claude Max setup (if applicable)

If the user uses Claude Max:

1. Verify `claude` CLI is authenticated:
   ```bash
   which claude && cat ~/.claude/.credentials.json | grep -c "user:profile"
   ```

2. Set up the usage monitor:
   ```bash
   ln -sf <install-dir>/apps/velboard/services/claude-usage-monitor ~/.openclaw/workspace/skills/claude-usage-monitor
   ```

3. Run the monitor once to create the initial data file:
   ```bash
   CLAUDE_USAGE_OUTPUT=~/.openclaw/workspace/claude-usage.json bash <install-dir>/apps/velboard/services/claude-usage-monitor/scripts/claude-usage-poll.sh
   ```

4. The claude-usage panel reads from `~/.openclaw/workspace/claude-usage.json`. If the file doesn't exist at startup, the panel will show "waiting for data" until the monitor runs.

---

## Step 4 — Sessions panel setup

The sessions panel needs a script to generate summary data from OpenClaw's session store. Set up a cron to run it every minute:

```bash
# Run it once to create the initial file
bash <install-dir>/apps/velboard/data/sessions-gen.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "* * * * * bash <install-dir>/apps/velboard/data/sessions-gen.sh") | crontab -
```

---

## Step 5 — Personalize (optional)

Edit `config.json` to customize the landing page:

```json
{
  "name": "My Agent",
  "emoji": "🤖",
  "role": "AI Assistant",
  "quote": "Always on. Always ready.",
  "traits": ["Loyal", "Sharp", "Resourceful"],
  "accent": "#c9a84c"
}
```

---

## Step 6 — Restart and verify

```bash
sudo systemctl restart vel
curl -s http://localhost:<port>/api/panels | python3 -m json.tool
```

---

## Updating

```bash
cd <install-dir>/apps/velboard
git pull
cd <install-dir>
./vel build
sudo systemctl restart vel
```

## Troubleshooting

- **Panels not showing** → Check `apps/velboard/panels/` exists and has `manifest.json` files
- **Claude usage empty** → Verify `claude-usage.json` exists in workspace
- **OpenClaw status empty** → Verify `openclaw` CLI is in PATH for the systemd service
- **Data sources "waiting for file"** → The systemd `User=` must match the user whose home directory has `~/.openclaw/`. If the service runs as `root` but files are under `/home/claw/`, tilde expansion points to `/root/` instead. Fix: set `User=` to the correct user
- **Sessions panel empty** → Verify the `sessions-gen.sh` cron is running: `crontab -l`
