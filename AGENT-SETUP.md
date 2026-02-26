# Agent Setup Instructions — OpenClaw Dashboard

**For OpenClaw agents:** Follow these steps when a user asks you to set up Clawboard. Clone the repo from GitHub, then ask questions via chat messages — no terminal access needed from the user.

---

## Step 0 — Clone from GitHub

```bash
cd ~/.openclaw/workspace
git clone https://github.com/karthikeyan5/clawboard.git
cd clawboard
```

## Step 1 — Ask the user these questions (one message)

Send a single message asking:

> I'll set up your dashboard! I need a few details:
>
> 1. **Agent name** — What should the dashboard call me? (e.g. "Hey Max", "Jarvis")
> 2. **Emoji** — Pick an emoji for the avatar (e.g. 🤖, ⚡, 🦞)
> 3. **Subtitle/tagline** — A short line under the name (e.g. "Always watching. Always learning.")
> 4. **Role** — What appears as my title (e.g. "AI Assistant", "AI Employee — Finance")
> 5. **Quote** — A philosophy quote for the landing page
> 6. **Company name** — For the footer
> 7. **Accent color** — Pick one: 🟡 Gold (#c9a84c), 🔴 Red (#e94560), 🔵 Cyan (#00d2ff), 🟣 Purple (#a855f7), 🟢 Green (#22c55e), 🟠 Orange (#f97316), or a custom hex
> 8. **Dashboard domain** — The domain you'll point to this server (e.g. dashboard.example.com)
> 9. **Do you have a Claude Max subscription?** — If yes, I'll set up usage monitoring too

Wait for their response before proceeding.

## Step 2 — Get bot credentials

You need the Telegram bot token. Check if it's already in your OpenClaw config:

```bash
# Try to read it from openclaw config
cat ~/.openclaw/openclaw.json | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1
```

If found, extract the bot token and username from your config. If not found, ask the user:

> I need your Telegram bot token. You can find it from @BotFather.
> Also, what's the bot username (without @)?

## Step 3 — Get allowed user IDs

You likely already know the user's Telegram ID from the chat metadata (the `chat_id` field). Ask:

> Your Telegram ID is `<their_id>`. Should anyone else have dashboard access? If so, send me their Telegram user IDs.

## Step 4 — Write config.json

Create `~/.openclaw/workspace/clawboard/config.json` with the collected values:

```json
{
  "name": "<agent_name>",
  "emoji": "<emoji>",
  "subtitle": "<subtitle>",
  "role": "<role>",
  "quote": "<quote>",
  "traits": ["Loyal", "Sharp", "Resourceful"],
  "cards": [
    {
      "icon": "🧠",
      "label": "Always Thinking",
      "text": "Research, analysis, automation — running 24/7 so you don't have to."
    },
    {
      "icon": "🔒",
      "label": "Dashboard",
      "text": "Sign in with Telegram to see system status and usage stats. Authorized users only."
    }
  ],
  "accent": "<accent_hex>",
  "accentName": "custom",
  "company": "<company>",
  "botUsername": "<bot_username>",
  "authUrl": "https://<domain>/auth/telegram/callback",
  "telegramLink": "https://t.me/<bot_username>",
  "allowedUsers": [<user_ids>],
  "port": 3700
}
```

## Step 5 — Write .env

```bash
echo "BOT_TOKEN=<bot_token>" > ~/.openclaw/workspace/clawboard/.env
chmod 600 ~/.openclaw/workspace/clawboard/.env
```

## Step 6 — Install dependencies

```bash
cd ~/.openclaw/workspace/clawboard
npm install --production
```

## Step 7 — Claude Max setup (if applicable)

If the user said yes to Claude Max:

1. Check if `claude` CLI is installed and authenticated:
   ```bash
   which claude && cat ~/.claude/.credentials.json | grep -c "user:profile"
   ```

2. If authenticated with `user:profile` scope:
   The monitor is built into Clawboard at `core/services/claude-usage-monitor/`.

3. Test it:
   ```bash
   CLAUDE_USAGE_OUTPUT=~/.openclaw/workspace/claude-usage.json bash ~/.openclaw/workspace/clawboard/core/services/claude-usage-monitor/scripts/claude-usage-poll.sh
   ```

4. Set up a cron job (use OpenClaw cron tool):
   - Schedule: every minute
   - Command: `bash ~/.openclaw/workspace/clawboard/core/services/claude-usage-monitor/scripts/claude-usage-poll.sh`

5. If NOT authenticated or `claude login` hasn't been run, tell the user:
   > For Claude usage monitoring, you need to run `claude login` in your terminal once (it opens a browser). After that, I'll handle the rest automatically. Skip this for now if you don't need it — the dashboard works fine without it.

If the user said no to Claude Max, skip this step entirely. The dashboard will show system metrics only.

## Step 8 — Nginx reverse proxy

Check if nginx is installed:
```bash
which nginx
```

If installed, generate and write the config:

```bash
# Check if SSL is terminated upstream (e.g. Cloudflare)
# If the server is behind Cloudflare or a load balancer, use port 80 only
# Otherwise, suggest Let's Encrypt

sudo tee /etc/nginx/sites-available/<domain> > /dev/null << 'EOF'
server {
    listen 80;
    server_name <domain>;

    location / {
        proxy_pass http://127.0.0.1:3700;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/<domain> /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If nginx is NOT installed, tell the user:
> Nginx isn't installed. You'll need to set up a reverse proxy to expose the dashboard. I've started the server on port 3700 — you can access it directly at `http://<server-ip>:3700` for now, but you'll need HTTPS for Telegram Login Widget to work.

## Step 9 — Systemd service

```bash
sudo tee /etc/systemd/system/clawboard.service > /dev/null << EOF
[Unit]
Description=OpenClaw Agent Dashboard
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(echo ~/.openclaw/workspace/clawboard)
EnvironmentFile=$(echo ~/.openclaw/workspace/clawboard/.env)
ExecStart=$(which node) core/server.js
Restart=on-failure
RestartSec=5
Environment=TZ=$(cat /etc/timezone 2>/dev/null || echo 'UTC')

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now clawboard.service
```

Verify it's running:
```bash
sleep 2 && curl -s http://localhost:3700/api/health
```

## Step 10 — Tell the user what they need to do manually

Send this message:

> ✅ Dashboard is live at `https://<domain>`
>
> **One thing you need to do manually** — open @BotFather on Telegram:
>
> 1. `/mybots` → select your bot → `Bot Settings` → `Domain` → enter: `<domain>`
>    _(required for the Login Widget to work in browsers)_
>
> 2. Optionally, set a Menu Button:
>    `/mybots` → `Bot Settings` → `Menu Button`
>    - Text: `📊 Dashboard`
>    - URL: `https://<domain>/dashboard`
>
> After setting the domain in BotFather, try opening `https://<domain>` in your browser and signing in with Telegram!

## Error Handling

- If `npm install` fails → check Node.js version (`node -v`, needs 18+)
- If port 3700 is in use → change `port` in config.json and update nginx config
- If systemd service fails → check `journalctl -u clawboard -f`
- If nginx test fails → check `sudo nginx -t` for syntax errors
- If Telegram Login shows "Bot domain invalid" → BotFather domain not set (Step 10)

## Post-Setup

After everything is working, send this closing message to the user:

> ✅ Your dashboard is live!
>
> **Why this matters:** Every time you ask me "what's my CPU usage?" or "how much quota do I have left?", that's tokens and time. This dashboard moves those routine checks into a live UI — no tokens burned, no waiting. Just open and look.
>
> And this is just one example. I can build any interface for you — approval workflows, report viewers, data entry forms, monitoring panels — anything where a direct UI beats a chat round-trip. I build it once, you use it forever.
>
> Just tell me what you need!

Then update your memory:

```markdown
## Dashboard
- Running at https://<domain> on port 3700
- Systemd service: clawboard.service
- Config: ~/.openclaw/workspace/clawboard/config.json
- Secrets: ~/.openclaw/workspace/clawboard/.env (BOT_TOKEN)
- Nginx: /etc/nginx/sites-available/<domain>
```
