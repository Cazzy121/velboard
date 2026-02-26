# 🦞 Clawboard

A Telegram-authenticated, modular web dashboard for your OpenClaw agent. Live system metrics, optional Claude usage stats, scheduled job management, and a personality-driven landing page — all extensible via panels, hooks, and plugins.

> **Why this exists:** Every time you ask your agent "what's my CPU usage?" or "how much quota do I have left?", that's a full round-trip — tokens in, tokens out, seconds of waiting. Multiply that by every routine check, every day.
>
> This dashboard moves those read-heavy interactions out of chat and into a live UI. No tokens burned. No waiting. Just open and look.
>
> But this is just one example. Your agent can build any interface — approval workflows, report viewers, data entry forms, monitoring panels — anything where a direct UI beats a chat round-trip. The agent builds it once, you use it forever.

## What You Get

- **9 modular panels** — CPU, Memory, Disk, Uptime, Processes, Claude Usage, Cron Jobs, Model Routing, OpenClaw Status
- **Live WebSocket updates** — 2-second refresh, no polling
- **Extensible architecture** — Custom panels, hooks, plugins, themes — all without touching core code
- **Landing page** — Animated page with personality, traits, quote, and Telegram Login Widget
- **Dual auth** — Telegram Mini App (inline in chat) + Login Widget (browser)
- **Config-driven** — Name, emoji, colors, traits — all from `config.json`
- **Security hardened** — Rate limiting, timing-safe HMAC, signed cookies, security headers, no shell injection
- **Error boundaries** — Bad custom panel → graceful fallback, dashboard never crashes

## Quick Start

### Prerequisites
- Node.js 18+
- An OpenClaw instance running on the same machine
- A Telegram bot (create via [@BotFather](https://t.me/BotFather))

### Option A: Send your agent the GitHub link (easiest)

Just send your OpenClaw agent the GitHub link and say:

> Set up Clawboard from https://github.com/karthikeyan5/clawboard

The agent should:
```bash
git clone https://github.com/karthikeyan5/clawboard.git
cd clawboard
bash setup.sh
```

Your agent will read `AGENT-SETUP.md`, ask you a few questions in chat, and handle everything — no terminal needed.

### Option B: Terminal setup wizard

```bash
bash setup.sh
```

The interactive wizard handles everything: config, bot token, nginx, systemd, BotFather reminders.

### Option C: Manual setup

```bash
# 1. Copy the example config
cp config.example.json config.json
nano config.json

# 2. Set your bot token (NEVER in config.json)
echo "BOT_TOKEN=123456:ABC-DEF..." > .env
chmod 600 .env

# 3. Install dependencies
npm install --production

# 4. Start
node core/server.js
```

## Configuration

### `config.json` — Personality & Appearance

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Agent display name | `"Chittibabu"` |
| `emoji` | Avatar emoji | `"🤖"` |
| `subtitle` | Tagline under name | `"Super-intelligent. Loyal."` |
| `role` | Role badge | `"AI Employee — Finance"` |
| `quote` | Philosophy quote on landing page | `"Duty first, always."` |
| `traits` | 2-4 word badges | `["Loyal", "Sharp"]` |
| `cards` | Info cards on landing page | See `config.example.json` |
| `accent` | Theme accent color (hex) | `"#c9a84c"` |
| `company` | Company name in footer | `"My Company"` |
| `botUsername` | Telegram bot username | `"MyAgentBot"` |
| `authUrl` | Login callback URL | `"https://domain.com/auth/telegram/callback"` |
| `telegramLink` | Link to your bot | `"https://t.me/MyAgentBot"` |
| `allowedUsers` | Telegram user IDs allowed | `[123456789]` |
| `port` | Server port | `3700` |
| `panels.order` | Panel display order | `["cpu", "memory", "disk"]` |
| `panels.disabled` | Panels to hide | `["openclaw-status"]` |
| `plugins` | External plugin repos | `[{"name":"x","repo":"..."}]` |

### `.env` — Secrets

```
BOT_TOKEN=your-telegram-bot-token-here
```

> ⚠️ The bot token is **never** stored in `config.json`. The `.env` file is `chmod 600`. Add it to `.gitignore`.

### Accent Colors

| Color | Hex | Vibe |
|-------|-----|------|
| Gold | `#c9a84c` | Premium, loyal |
| Red | `#e94560` | Bold, aggressive |
| Cyan | `#00d2ff` | Tech, clean |
| Purple | `#a855f7` | Creative, mystical |
| Green | `#22c55e` | Natural, calm |
| Orange | `#f97316` | Energetic, warm |

## Architecture

```
clawboard/
├── core/                          ← UPSTREAM (never edit)
│   ├── server.js                  ← Express + WebSocket + hook engine + panel loader
│   ├── lib/
│   │   ├── hooks.js               ← WordPress-style actions + filters
│   │   ├── auth.js                ← Telegram auth (Mini App + Login Widget)
│   │   ├── panels.js              ← Panel discovery, loading, error boundaries
│   │   └── updater.js             ← Version check + GitHub auto-update
│   ├── services/
│   │   └── claude-usage-monitor/  ← Polls Anthropic API for usage stats
│   │       ├── scripts/claude-usage-poll.sh
│   │       ├── SKILL.md
│   │       └── README.md
│   ├── panels/                    ← 9 built-in panels
│   │   ├── cpu/                   ← manifest.json + api.js + ui.js
│   │   ├── memory/
│   │   ├── disk/
│   │   ├── uptime/
│   │   ├── processes/
│   │   ├── claude-usage/
│   │   ├── crons/
│   │   ├── models/
│   │   └── openclaw-status/
│   ├── public/
│   │   ├── shell.html             ← Dashboard shell (loads panels dynamically)
│   │   ├── landing.html           ← Animated landing page
│   │   └── core.css               ← Base styles + CSS variables
│   └── templates/                 ← Copy-paste examples for AI agents
│       ├── panel-example/
│       ├── plugin-example/
│       └── theme-example/
│
├── custom/                        ← YOUR CODE (git-ignored, you own this)
│   ├── panels/                    ← Custom panels (same structure as core/panels)
│   ├── overrides/                 ← Override core panels (folder name match)
│   ├── theme/theme.css            ← CSS overrides
│   ├── routes/*.js                ← Custom API endpoints
│   ├── hooks.js                   ← Hook registrations
│   └── config-schema.json         ← Extend config with custom fields
│
├── plugins/                       ← EXTERNAL (git-ignored, installed from repos)
│   └── plugin-name/
│       ├── manifest.json
│       ├── panels/
│       ├── hooks.js
│       └── routes/
│
├── config.json                    ← Your config (git-ignored, no secrets)
├── .env                           ← BOT_TOKEN (chmod 600, git-ignored)
├── .cookie-secret                 ← Auto-generated (chmod 600, git-ignored)
├── .version                       ← Installed version tracking
├── .gitignore
├── package.json
├── setup.sh                       ← Terminal setup wizard
├── AGENT-SETUP.md                 ← Chat-based setup (for AI agents)
├── AGENT-EXTEND.md                ← How to build panels, plugins, themes
├── ROADMAP.md                     ← v2→v6 roadmap
└── README.md
```

### Panel Contract

Every panel — core, custom, or plugin — is a folder with 3 files:

```
my-panel/
├── manifest.json     ← Metadata (id, name, size, position, refreshMs)
├── api.js            ← Server-side: data endpoint
└── ui.js             ← Client-side: Lit web component
```

### Extension Points

| Want to... | Do this |
|------------|---------|
| Add a new panel | Create folder in `custom/panels/` |
| Redesign a core panel | Copy to `custom/overrides/{panel-id}/` |
| Modify data before it's sent | Add filter in `custom/hooks.js` |
| Add a custom API endpoint | Create file in `custom/routes/` |
| Change colors/fonts | Create `custom/theme/theme.css` |
| Install a community panel | `git clone` into `plugins/` |

See **AGENT-EXTEND.md** for full instructions.

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | None | Landing page |
| `/dashboard` | GET | Cookie/Mini App | Live dashboard |
| `/api/config` | GET | None | Safe config (no secrets) |
| `/api/panels` | GET | None | Panel manifest list |
| `/api/panels/{id}` | GET/POST | Auth | Individual panel data |
| `/api/auth` | GET/POST | Cookie/initData | Auth check |
| `/api/usage` | GET/POST | Auth | Claude usage stats |
| `/api/usage/refresh` | POST | Auth | Refresh usage from API |
| `/api/status` | GET/POST | Auth | OpenClaw raw status |
| `/api/crons` | GET/POST | Auth | Scheduled jobs list |
| `/api/crons/action` | POST | Auth | Run/enable/disable a cron job |
| `/api/version` | GET | None | Version info |
| `/api/health` | GET | None | Health check |
| `/auth/telegram/callback` | GET | Widget | Login callback |
| `/auth/logout` | GET | None | Clear session |
| `/ws/metrics` | WS | Auth | Live panel data stream (2s) |

### Auth Flow

1. **Telegram Mini App** — User opens dashboard inline → `initData` validated via HMAC → access granted
2. **Browser** — User visits URL → clicks Login Widget → Telegram OAuth → signed cookie → redirected

## Claude Usage Monitoring (Built-in)

Clawboard includes a built-in Claude usage monitor at `core/services/claude-usage-monitor/`. If you have an **Anthropic Claude Max subscription**, the Claude Usage panel shows real-time stats (5-hour session %, 7-day weekly %, per-model breakdown).

### How it works

1. The script `core/services/claude-usage-monitor/scripts/claude-usage-poll.sh` reads your Claude Code OAuth credentials
2. It polls the Anthropic usage API and writes `claude-usage.json` to your workspace
3. The `claude-usage` dashboard panel reads this file automatically and displays live stats
4. A cron job runs the script every 60 seconds to keep data fresh

### Setup

1. Authenticate Claude Code with full browser login: `claude login` (NOT `setup-token`)
2. Set up a cron job to poll usage:
   ```bash
   # Via OpenClaw cron:
   openclaw cron add --name "claude-usage-poll" --schedule "*/1 * * * *" \
     --command "bash /path/to/clawboard/core/services/claude-usage-monitor/scripts/claude-usage-poll.sh"
   ```
3. The dashboard panel auto-detects the usage file — no extra config needed

### What it tracks

| Metric | Description |
|--------|-------------|
| 5-hour session % | Rolling 5-hour window utilization |
| 7-day weekly % | Rolling weekly usage (all models) |
| Opus % | Weekly Opus-specific cap usage |
| Sonnet % | Weekly Sonnet-specific cap usage |
| Reset times | When each capacity window resets |

**No Claude Max?** The dashboard works perfectly fine without it. The panel is simply hidden — you get 8 panels instead of 9.

## Nginx Reverse Proxy

The setup wizard generates this for you. Manual config:

### With upstream SSL (Cloudflare, load balancer)
```nginx
server {
    listen 80;
    server_name dashboard.example.com;

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
```

### With Let's Encrypt SSL
```nginx
server {
    listen 80;
    server_name dashboard.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.example.com;
    ssl_certificate     /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3700;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400;
    }
}
```

> `proxy_read_timeout 86400` and WebSocket upgrade headers are required for live updates.

## BotFather Configuration

**Required** for the Telegram Login Widget to work in browsers.

1. **Set domain:** `/mybots` → your bot → `Bot Settings` → `Domain` → `dashboard.example.com`
2. **Menu Button (optional):** `Bot Settings` → `Menu Button` → URL: `https://dashboard.example.com/dashboard`
3. **Mini App (optional):** `/newapp` → your bot → Web App URL: `https://dashboard.example.com`

## Systemd Service

```bash
sudo tee /etc/systemd/system/clawboard.service > /dev/null << 'EOF'
[Unit]
Description=OpenClaw Agent Dashboard
After=network.target

[Service]
Type=simple
User=claw
WorkingDirectory=/path/to/dashboard
EnvironmentFile=/path/to/dashboard/.env
ExecStart=/usr/bin/node core/server.js
Restart=on-failure
RestartSec=5
Environment=TZ=UTC

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now clawboard.service
```

## Security

- Bot token in `.env` only — never in config, never in git, never exposed to frontend
- `.env` and `.cookie-secret` are `chmod 600`
- `/api/config` strips all secrets
- Cookies: signed, httpOnly, secure, sameSite=lax
- Persistent cookie secret (`.cookie-secret` file)
- Only `allowedUsers` can access authenticated endpoints
- Timing-safe HMAC-SHA256 validation, 24h expiry
- Rate limiting: API 100/15min, auth 10/15min, status 10/min
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- `execFileSync` with `shell: false` (no injection)
- Error boundaries: custom/plugin panels can't crash the dashboard

## Extending the Dashboard

See **AGENT-EXTEND.md** for the full AI agent playbook, or **ROADMAP.md** for the v2→v6 vision.

Your agent can build any interface. This dashboard is just the starting point.

## License

MIT — use it however you want.

---

*Built for the [OpenClaw](https://github.com/openclaw/openclaw) community.*
