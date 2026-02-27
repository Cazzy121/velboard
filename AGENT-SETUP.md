# Clawboard — Agent Setup Guide

**For AI agents:** Step-by-step instructions to install Clawboard panels into an existing Vel instance.

**Prerequisites:** [Vel](https://github.com/essdee/vel) must be installed and running. See [Vel AGENT-SETUP.md](https://github.com/essdee/vel/blob/main/AGENT-SETUP.md) for framework setup.

---

## Step 1 — Ask the user

You need:
1. Where is the Vel app directory? (e.g., `~/.openclaw/workspace/my-dashboard/`)
2. Do they use Claude Max? (for the Claude usage panel)

## Step 2 — Install panels

```bash
cd <vel-app-dir>/plugins/
git clone https://github.com/karthikeyan5/clawboard.git
```

## Step 3 — Configure panel order

Edit `<vel-app-dir>/config.json` and add the panel order:

```json
{
  "panels": {
    "order": ["cpu", "memory", "disk", "uptime", "processes", "claude-usage", "openclaw-status", "crons", "models"],
    "disabled": []
  }
}
```

## Step 4 — Claude Max setup (if applicable)

If the user said yes to Claude Max:

1. Check if `claude` CLI is installed and authenticated:
   ```bash
   which claude && cat ~/.claude/.credentials.json | grep -c "user:profile"
   ```

2. If authenticated, set up the usage monitor:
   ```bash
   # Create skill symlink if not already present
   ln -sf <vel-app-dir>/plugins/clawboard/services/claude-usage-monitor ~/.openclaw/workspace/skills/claude-usage-monitor
   ```

3. The claude-usage panel will auto-detect usage data from `~/.openclaw/workspace/claude-usage.json`.

## Step 5 — Restart Vel

```bash
sudo systemctl restart <vel-service-name>
```

Verify panels loaded:
```bash
curl -s http://localhost:3700/api/panels | python3 -m json.tool
```

All 9 panels should appear with `plugin:clawboard` source.

## Step 6 — Personalize (optional)

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

## Updating

```bash
cd <vel-app-dir>/plugins/clawboard
git pull
```

Restart Vel to pick up changes.

## Troubleshooting

- **Panels not showing** → check `plugins/clawboard/panels/` exists and has manifest.json files
- **Claude usage empty** → verify `claude-usage.json` exists in workspace
- **OpenClaw status empty** → verify `openclaw` CLI is in PATH
