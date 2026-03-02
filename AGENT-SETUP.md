# ⚡ Velboard — Agent Setup Guide

**For AI agents:** Step-by-step instructions to set up Velboard from scratch, including the Vel framework.

---

## Step 0 — Ask the user

Before starting, ask:

1. **Server domain** — What domain will this run on? (e.g., `dashboard.example.com`)
2. **Telegram Bot Token** — Do you have a Telegram bot token? (needed for auth)
3. **Telegram User IDs** — Which Telegram user IDs should have dashboard access?
4. **Claude Max?** — Do they use Claude CLI with a Max subscription? (for usage panel)
5. **Port** — What port to run on? (default: `3700`)
6. **Install directory** — Where to install? (default: `/opt/vel`)

---

## Step 1 — Install the Vel framework

Vel is the dashboard framework that Velboard's panels plug into.

```bash
# Clone Vel
git clone https://github.com/essdee/vel.git <install-dir>
cd <install-dir>

# Install Go (if not present)
go version || {
  curl -LO https://go.dev/dl/go1.24.1.linux-amd64.tar.gz
  sudo tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz
  export PATH=$PATH:/usr/local/go/bin
  echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
}

# Create config from example
cp config.example.json config.json
```

Edit `config.json` with the user's details:

```json
{
  "name": "<agent-name>",
  "emoji": "⚡",
  "role": "AI Agent",
  "quote": "Always on. Always ready.",
  "traits": ["Reliable", "Fast"],
  "accent": "#c9a84c",
  "botUsername": "<bot-username>",
  "authUrl": "https://<domain>/auth/telegram/callback",
  "telegramLink": "https://t.me/<bot-username>",
  "allowedUsers": [<telegram-user-ids>],
  "port": <port>,
  "panels": {
    "order": ["claude-usage", "cpu", "memory", "disk", "uptime", "processes", "openclaw-status", "sessions", "crons", "models"],
    "disabled": []
  }
}
```

Set up the bot token:

```bash
echo "BOT_TOKEN=<token>" > <install-dir>/.env
```

---

## Step 2 — Install Velboard panels

```bash
cd <install-dir>/apps/
git clone https://github.com/karthikeyan5/velboard.git
```

Build Vel with Velboard included:

```bash
cd <install-dir>
go run . build --mode=bypass
```

Verify panels are discovered:

```bash
cd <install-dir>
./vel
# Look for "App Report" showing velboard with panels loaded
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

4. The claude-usage panel reads from `~/.openclaw/workspace/claude-usage.json`. If the file doesn't exist at startup, the panel will show "waiting for data" until the monitor runs and creates it.

---

## Step 3b — Sessions panel setup

The sessions panel needs a script to generate summary data from OpenClaw's session store. Set up a system cron to run it every minute:

```bash
# Run it once to create the initial file
bash <install-dir>/apps/velboard/data/sessions-gen.sh

# Add to system crontab
(crontab -l 2>/dev/null; echo "* * * * * bash <install-dir>/apps/velboard/data/sessions-gen.sh") | crontab -
```

---

## Step 4 — systemd service

Create `/etc/systemd/system/vel.service`:

```ini
[Unit]
Description=Vel Dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=<install-dir>
ExecStart=<install-dir>/vel
EnvironmentFile=<install-dir>/.env
Restart=always
RestartSec=5
User=<username>  # use the appropriate system user

[Install]
WantedBy=multi-user.target
```

**Important:** The OpenClaw panels (status, crons, models) need `openclaw` CLI in the service's PATH. Find where it's installed and add it:

```bash
# Find openclaw
OPENCLAW_BIN=$(dirname $(which openclaw))

# Add to the service Environment (edit the file above):
# Environment=PATH=<openclaw-bin-dir>:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

Or create a symlink:
```bash
sudo ln -sf $(which openclaw) /usr/local/bin/openclaw
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vel
sudo systemctl start vel
```

Verify:

```bash
curl -s http://localhost:<port>/api/panels | python3 -m json.tool
```

---

## Step 5 — Expose to the internet

**⏸️ STOP — Ask the user how they want to expose the dashboard before proceeding.**

> How would you like to expose the dashboard to the internet?
>
> 1. **Nginx + Let's Encrypt** — if you already have nginx installed
> 2. **Caddy** — automatic HTTPS, simpler config
> 3. **Cloudflare Tunnel** — no open ports needed, zero-trust
> 4. **Direct / I already have a reverse proxy** — just tell me the port
> 5. **I don't know, guide me** — I'll check your setup and recommend the simplest option

**Wait for the user's answer before proceeding.** If they pick option 5, check what's already installed (`which nginx`, `which caddy`, `which cloudflared`) and recommend **Caddy** for simplicity if nothing is installed.

---

### Option A: Nginx + Let's Encrypt

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/vel`:

```nginx
server {
    listen 80;
    server_name <domain>;

    location / {
        proxy_pass http://127.0.0.1:<port>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/vel /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d <domain>
```

### Option B: Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Add to `/etc/caddy/Caddyfile`:

```
<domain> {
    reverse_proxy localhost:<port>
}
```

Caddy handles HTTPS automatically. Restart:

```bash
sudo systemctl restart caddy
```

### Option C: Cloudflare Tunnel

See [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). Create a tunnel pointing to `http://localhost:<port>`.

### Option D: Direct / Existing reverse proxy

Vel runs on `http://localhost:<port>`. Point your existing reverse proxy there.

> **⚠️ WebSocket support is required** for all reverse proxy options. Make sure your proxy forwards `Upgrade` and `Connection` headers — without this, live dashboard updates will fail.

---

## Step 6 — Telegram Bot Setup

### A) Set the Menu Button (automated)

Run this to add a "📊 Dashboard" button to the bot's chat menu:

```bash
curl -s -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "📊 Dashboard",
      "web_app": {"url": "https://<domain>/dashboard"}
    }
  }'
```

### B) Set the Login Widget Domain (manual — no API)

**⏸️ Ask the user to do this step manually and confirm when done:**

> Open **@BotFather** → `/mybots` → select your bot → **Bot Settings** → **Domain** → enter: `<domain>`
>
> This is required for the Telegram Login Widget to work. There is no API for this — it must be done in BotFather.
>
> Let me know when you've done this.

---

## Step 7 — Personalize (optional)

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

## Updating

```bash
cd <install-dir>/apps/velboard
git pull
sudo systemctl restart vel
```

## Troubleshooting

- **Panels not showing** → check `apps/velboard/panels/` exists and has manifest.json files
- **Claude usage empty** → verify `claude-usage.json` exists in workspace
- **OpenClaw status empty** → verify `openclaw` CLI is in PATH
- **Auth not working** → verify BOT_TOKEN is set and Telegram webhook domain matches
