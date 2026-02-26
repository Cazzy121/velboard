<p align="center">
  <img src="./screenshots/dashboard.png" alt="Clawboard Dashboard" width="700">
</p>

<h1 align="center">🦞 Clawboard</h1>

<p align="center">
  <strong>Stop burning tokens on status checks.</strong><br>
  A real-time dashboard for your AI agent — so you can <em>look</em> instead of <em>ask</em>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-c9a84c?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/node-18%2B-blue?style=flat-square" alt="Node">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
</p>

---

## The Problem

Every time you ask your agent *"what's my CPU?"* or *"how much quota left?"* — that's tokens in, tokens out. Seconds of waiting. Multiply by every routine check, every day.

**You're paying to read a number.**

## The Solution

Clawboard gives your OpenClaw agent a live web dashboard. WebSocket-powered. Telegram-authenticated. Zero tokens burned.

Open a tab. See everything. Done.

- **9 modular panels** — CPU, Memory, Disk, Uptime, Processes, Claude Usage, Crons, Models, OpenClaw Status
- **Live updates** — 2-second WebSocket refresh, no polling
- **Telegram auth** — Mini App (inline) + Login Widget (browser)
- **Config-driven** — Name, emoji, colors, traits — one JSON file
- **Personality landing page** — Animated, branded, yours
- **Extensible** — Custom panels, hooks, plugins, themes
- **Security hardened** — HMAC validation, rate limiting, signed cookies

## Screenshots

<table>
<tr>
<td><strong>Landing Page</strong></td>
<td><strong>Dashboard</strong></td>
</tr>
<tr>
<td><img src="./screenshots/landing.png" alt="Landing" width="400"></td>
<td><img src="./screenshots/dashboard.png" alt="Dashboard" width="400"></td>
</tr>
<tr>
<td><strong>Landing (Mobile)</strong></td>
<td><strong>Dashboard (Mobile)</strong></td>
</tr>
<tr>
<td><img src="./screenshots/landing-mobile.png" alt="Landing Mobile" width="200"></td>
<td><img src="./screenshots/dashboard-mobile.png" alt="Dashboard Mobile" width="200"></td>
</tr>
</table>

## Quick Start

```bash
# 1. Clone
git clone https://github.com/karthikeyan5/clawboard.git
cd clawboard

# 2. Run the setup wizard
bash setup.sh

# 3. Done. Open your dashboard URL.
```

Or just send your agent the repo link. It reads `AGENT-SETUP.md` and handles everything.

## Panels

| Icon | Panel | Size | What it shows |
|------|-------|------|---------------|
| ⚡ | **CPU** | half | Load %, core count, color-coded bar |
| 🧠 | **Memory** | half | Used/total, percentage, bar |
| 💾 | **Disk** | half | Used/total, mount point, bar |
| ⏱ | **Uptime** | half | Days/hours/minutes, hostname |
| ⚙️ | **Processes** | half | Total, running, sleeping, OS |
| 🔧 | **OpenClaw** | half | Version, sessions, memory, channel |
| 📊 | **Claude Usage** | full | 5hr + 7day quotas with reset timers |
| 📅 | **Crons** | full | Jobs list, status, run/disable actions |
| 🤖 | **Models** | full | Primary, fallback, sub-agent routing |

All panels are independent. Disable any in `config.json`. Add your own.

## Customization

```json
{
  "name": "My Agent",
  "emoji": "🤖",
  "accent": "#c9a84c",
  "traits": ["Loyal", "Sharp", "Resourceful"],
  "quote": "I don't wait for permission."
}
```

| Color | Hex | Vibe |
|-------|-----|------|
| 🟡 Gold | `#c9a84c` | Classic, warm |
| 🔵 Cyan | `#00d2ff` | Tech, cool |
| 🟢 Emerald | `#10b981` | Fresh, calm |
| 🔴 Rose | `#f43f5e` | Bold, urgent |
| 🟣 Purple | `#a855f7` | Creative, deep |

## Architecture

```
clawboard/
├── core/
│   ├── server.js          # Express + WebSocket server
│   ├── auth.js            # Telegram HMAC + cookie auth
│   ├── metrics.js         # System metrics collector
│   ├── panels/            # 9 built-in panels
│   │   ├── cpu/
│   │   │   ├── panel.json # { id, name, size, order }
│   │   │   └── ui.js      # render() + update() contract
│   │   ├── memory/
│   │   └── ...
│   └── public/
│       ├── shell.html     # Dashboard shell (loads panels dynamically)
│       ├── landing.html   # Public landing page
│       └── core.css       # Theme variables + base styles
├── config.json            # Your config (git-ignored)
├── config.example.json    # Template
└── setup.sh               # Interactive setup wizard
```

### Panel Contract

Every panel exports two functions:

```js
window.DashboardPanels['my-panel'] = {
  render(el, data) { /* Build DOM skeleton — called once */ },
  update(el, data) { /* Surgical DOM updates — called every 2s */ }
};
```

## Extending

**Add a panel:**
```bash
cp -r core/templates/panel-example panels/my-panel
# Edit panel.json + ui.js
# Restart. It auto-discovers.
```

**Add a hook:** Hooks run server-side on every metrics cycle. Drop a `.js` file in `hooks/`.

**Add a route:** Custom Express routes in `routes/`. Auto-mounted.

**Change themes:** Override CSS variables in `config.json` or add a custom stylesheet.

See [`AGENT-EXTEND.md`](./AGENT-EXTEND.md) for the full guide.

## Security

- Telegram `initData` validated with **timing-safe HMAC-SHA256**
- Browser auth via **signed, httpOnly cookies**
- **Rate limiting** on all auth endpoints
- **Helmet** security headers
- WebSocket auth on connect
- No shell injection — all metrics via Node.js APIs
- `allowedUsers` whitelist in config

## For AI Agents

This is the killer feature: **your agent sets up the dashboard for you.**

Send your OpenClaw agent:

> Set up Clawboard from https://github.com/karthikeyan5/clawboard

It reads [`AGENT-SETUP.md`](./AGENT-SETUP.md), asks you a few questions in chat (bot token, domain), and handles:

- Cloning, config generation
- Nginx reverse proxy
- SSL via Let's Encrypt
- Systemd service
- BotFather webhook setup

Zero terminal. Zero DevOps. The agent does it all.

## Contributing

PRs welcome. Keep it modular. One panel per folder. Tests appreciated.

```bash
npm test
```

## License

[MIT](./LICENSE) — Use it however you want.

---

<p align="center">
  <sub>Built for <a href="https://github.com/nichochar/openclaw">OpenClaw</a> agents. Made with 🦞 by humans and AI.</sub>
</p>
