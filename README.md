<p align="center">
  <img src="./screenshots/dashboard-mobile.png" alt="Clawboard Dashboard" width="300">
</p>

<h1 align="center">🦞 Clawboard</h1>

<p align="center">
  <strong>Your AI agent shouldn't waste tokens telling you the time.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-c9a84c?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/binary_size-10MB-00ADD8?style=flat-square" alt="Size">
  <img src="https://img.shields.io/badge/TTFB-4ms-brightgreen?style=flat-square" alt="TTFB">
  <img src="https://img.shields.io/badge/RAM-2.6MB-brightgreen?style=flat-square" alt="RAM">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

<p align="center">
  <sub>Single Go binary. 10 panels. WebSocket-powered. Telegram-authenticated.<br>Your agent installs it. You just look.</sub>
</p>

---

## You're paying to read a number

Every *"what's my CPU at?"* costs tokens. Every *"how much Claude quota left?"* — more tokens. You're burning money to ask questions a dashboard could answer in zero seconds, forever.

**Clawboard is a real-time dashboard for [OpenClaw](https://github.com/openclaw/openclaw) agents.** One binary. No dependencies. Your agent talks less. You see more.

## 76ms

That's full page load. Not time-to-first-byte. Not a lighthouse estimate. Real, measured, from-click-to-every-panel-rendered. On a $7/month server.

For comparison: the average dashboard loads in 3-8 seconds.

<details>
<summary><strong>How we measured it</strong></summary>

Chrome DevTools Protocol, two tabs opened simultaneously against the same server, Navigation Timing API:

| Metric | Clawboard | Typical dashboard |
|--------|-----------|------------------|
| TTFB | 4ms | 200-500ms |
| Full load | 76ms | 3,000-8,000ms |
| RAM usage | 2.6MB | 100-300MB |
| Binary size | 10MB | 200MB+ (node_modules) |

</details>

## What you get

| Panel | What it shows |
|-------|---------------|
| ⚡ **CPU** | Load %, core count, color-coded bar |
| 🧠 **Memory** | Used/total GB, percentage bar |
| 💾 **Disk** | Usage per mount point |
| ⏱ **Uptime** | System uptime + hostname |
| ⚙️ **Processes** | Running/sleeping/total |
| 🔧 **OpenClaw Status** | Version, sessions, channel |
| 📊 **Claude Usage** | 5-hour + 7-day quotas with reset countdowns |
| 📅 **Cron Jobs** | List, status, run/enable/disable buttons |
| 🤖 **Models** | Primary, fallback, sub-agent routing |

All panels update every 2 seconds via WebSocket. No polling. No refresh.

## Screenshots

<table>
<tr>
<td><img src="./screenshots/landing-mobile.png" alt="Landing" width="280"></td>
<td><img src="./screenshots/dashboard-mobile.png" alt="Dashboard" width="280"></td>
</tr>
<tr>
<td align="center"><sub>Personality landing page</sub></td>
<td align="center"><sub>Live dashboard</sub></td>
</tr>
</table>

## Install

```bash
git clone https://github.com/karthikeyan5/clawboard.git
cd clawboard
go build -o clawboard .
cp config.example.json config.json  # edit with your bot token + user IDs
BOT_TOKEN=your-token ./clawboard
```

That's it. Open `localhost:3700`.

### Or let your agent do it

Send your OpenClaw agent this message:

> Set up Clawboard from https://github.com/karthikeyan5/clawboard

It reads [`AGENT-SETUP.md`](./AGENT-SETUP.md) and handles cloning, config, nginx, SSL, systemd — everything. Zero terminal.

### Development mode

```bash
TEST_MODE=true BOT_TOKEN=dummy ./clawboard
```

No Telegram needed. Auto-login. Instant dashboard.

## How it works

```
Browser ←── WebSocket (2s) ──→ Clawboard (Go) ──→ System metrics
   │                              │                    (gopsutil)
   │                              ├──→ OpenClaw CLI
   │                              ├──→ Claude usage JSON
   └── Preact+HTM (5KB, no build) └──→ Cron jobs
```

- **Backend**: Single Go binary. `net/http` + gorilla/websocket + gopsutil.
- **Frontend**: Preact + HTM. Vendored. No build step. No node_modules. Ever.
- **Auth**: Telegram HMAC-SHA256 — works as Mini App (inline) and Login Widget (browser). Timing-safe. Rate-limited. Signed httpOnly cookies.
- **Panels**: Each panel is a folder with `manifest.json` + `ui.js`. Drop a folder, restart, done.

## Add your own panel

```
core/panels/my-panel/
├── manifest.json    # name, version, size, refresh interval
└── ui.js            # Preact component (ESM, receives live data as props)
```

```json
{
  "id": "my-panel",
  "name": "My Panel",
  "version": "1.0.0",
  "size": "half",
  "refreshInterval": 5000
}
```

Panels auto-discover on startup. No registration. No config changes. See [`CONTRACTS.md`](./CONTRACTS.md) for the full panel contract.

## Config

```json
{
  "name": "My Agent",
  "emoji": "🤖",
  "accent": "#c9a84c",
  "traits": ["Loyal", "Sharp", "Resourceful"],
  "quote": "I don't wait for permission.",
  "auth": { "allowedUsers": [123456789] },
  "panels": { "order": ["cpu", "memory", "disk", "claude-usage"] }
}
```

Your agent gets a personality. Your dashboard gets a soul.

## Architecture

```
clawboard/
├── main.go              # Entrypoint
├── internal/            # Go backend
│   ├── auth/            # Telegram HMAC + cookie signing
│   ├── data/            # Metrics, usage, crons, status
│   ├── panels/          # Panel discovery + registry
│   └── server/          # HTTP + WebSocket + middleware
├── core/
│   ├── panels/          # 10 built-in panels (manifest + ui.js)
│   ├── vendor/          # Preact+HTM bundle (5KB)
│   └── public/          # Shell, landing, CSS, service worker
├── custom/              # Your stuff (git-ignored)
└── config.json          # Your config (git-ignored)
```

Decisions documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md). Conventions in [`CONVENTIONS.md`](./CONVENTIONS.md). Roadmap in [`ROADMAP.md`](./ROADMAP.md).

## Security

Not an afterthought:

- Telegram `initData` validated with **timing-safe HMAC-SHA256**
- Browser sessions via **signed httpOnly cookies**
- **Rate limiting** on auth endpoints (10 req/15min)
- **API rate limiting** (1000 req/15min)
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- WebSocket authenticates on connect
- `allowedUsers` whitelist — no user enumeration
- Gzip compression on all responses

## Why not Grafana / Uptime Kuma / Dashy?

| | Clawboard | Grafana | Uptime Kuma | Dashy |
|---|-----------|---------|-------------|-------|
| Built for AI agents | ✅ | ❌ | ❌ | ❌ |
| Claude/LLM quota tracking | ✅ | ❌ | ❌ | ❌ |
| Cron job management | ✅ | ❌ | ❌ | ❌ |
| Agent installs it | ✅ | ❌ | ❌ | ❌ |
| Single binary | ✅ | ❌ | ❌ | ❌ |
| RAM usage | 2.6MB | 200MB+ | 80MB+ | 50MB+ |
| Telegram native auth | ✅ | Plugin | ❌ | ❌ |
| Setup time | 60 seconds | Hours | Minutes | Minutes |

Clawboard doesn't replace monitoring tools. It gives your **AI agent** a face — and saves you from asking it dumb questions.

## Contributing

```bash
go test ./...
```

PRs welcome. One panel per folder. Keep it fast.

## License

[MIT](./LICENSE)

---

<p align="center">
  <sub>Built for <a href="https://github.com/openclaw/openclaw">OpenClaw</a>. Made by humans and AI, working together.</sub>
</p>
