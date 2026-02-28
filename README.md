<h1 align="center">🦞 Clawboard</h1>

<p align="center">
  <strong>The AI-native dashboard. Your agent builds it. The framework makes it work.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-c9a84c?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/built_with-Vel_⚡-ff6b35?style=flat-square" alt="Built with Vel">
  <img src="https://img.shields.io/badge/panels-10-00ADD8?style=flat-square" alt="Panels">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

---

## What if your AI could build dashboards?

Clawboard is a real-time monitoring dashboard built entirely by an AI agent. Every panel, every layout decision, every line of code — written by Claude through OpenClaw. **Your AI agent built this entire dashboard. Yours can build anything.**

The 10 panels that ship are just the starting point. The real power is the framework: tell your agent what you want to monitor, and it creates a working panel in seconds.

---

<p align="center">
  <img src="./screenshots/dashboard-mobile.png" alt="Clawboard Dashboard" width="600">
</p>

---

## 10 Panels, Zero Configuration

<table>
<tr>
<td align="center" width="25%">

⚡ **CPU**<br>
<sub>Live load percentage with color-coded bar</sub>

</td>
<td align="center" width="25%">

🧠 **Memory**<br>
<sub>Used/total GB with percentage bar</sub>

</td>
<td align="center" width="25%">

💾 **Disk**<br>
<sub>Usage per mount point</sub>

</td>
<td align="center" width="25%">

⏱ **Uptime**<br>
<sub>System uptime + hostname</sub>

</td>
</tr>
<tr>
<td align="center">

⚙️ **Processes**<br>
<sub>Running, sleeping, total count</sub>

</td>
<td align="center">

🔧 **OpenClaw Status**<br>
<sub>Version, sessions, channel</sub>

</td>
<td align="center">

📊 **Claude Usage**<br>
<sub>5-hour + 7-day quotas with countdowns</sub>

</td>
<td align="center">

📅 **Cron Jobs**<br>
<sub>List, status, run/enable/disable</sub>

</td>
</tr>
<tr>
<td align="center">

🤖 **Models**<br>
<sub>Primary, fallback, sub-agent routing</sub>

</td>
<td align="center">

🌐 **Browser Relay**<br>
<sub>Relay status, connected tab, messages</sub>

</td>
<td align="center" colspan="2">

✨ **Your panel here**<br>
<sub>Tell your AI agent what to build</sub>

</td>
</tr>
</table>

All panels update via WebSocket. No polling. No refresh.

---

## Create a Panel in 60 Seconds

A panel is two files. That's it.

**`panel.json`** — metadata:
```json
{
  "name": "my-panel",
  "title": "My Panel",
  "icon": "📊",
  "size": "half"
}
```

**`ui.js`** — a Preact component:
```javascript
import { html } from '/js/lib/htm-preact.js';

export default function Panel({ data }) {
  return html`<div class="panel-content">
    <h3>${data.value}</h3>
  </div>`;
}
```

Drop the folder into `panels/`, restart. Done. Your panel is live with WebSocket streaming, layout, and error handling — all handled by the framework.

---

## These Are Just the Defaults

The 10 panels that ship with Clawboard are a starting point. The real magic is what comes next.

**Tell your AI agent to build a monitoring panel for your database, your API, your CI pipeline, your smart home — whatever you can imagine.** The framework handles WebSocket streaming, layout, data sources, error handling. You just write the UI.

`panel.json` + `ui.js`. Pour your imagination in. The framework takes care of making sure it works.

---

## 🌐 Browser Relay

Clawboard includes a built-in browser relay server that lets your AI agent remotely control a browser via Chrome DevTools Protocol. Pair with a 6-character code, and your agent gets full CDP access — no extensions, no port forwarding.

📖 **[Full Browser Relay documentation →](./RELAY.md)**

---

## Quick Start

```bash
# Install into your Vel apps directory
cd your-vel-app/apps/
git clone https://github.com/karthikeyan5/clawboard.git

# Build (required — Clawboard has Go server code)
cd /path/to/vel && ./vel build

# Run
./vel start
```

---

## Built on Vel

Clawboard is a **[Vel](https://github.com/essdee/vel)** app — the AI-native web framework. Single Go binary. Manifest-driven panels. WebSocket-first. Your app runs before they finish reading this.

---

## License

[MIT](./LICENSE)
