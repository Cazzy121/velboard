<h1 align="center">Velboard</h1>

<p align="center">
  <strong>The dashboard that builds itself.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-c9a84c?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Vel_app-⚡-ff6b35?style=flat-square" alt="Vel App">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

---

You have an AI agent. You ask it things — CPU, quota, cron status — and it answers. But that's a message, a wait, and tokens spent. Every time.

Velboard gives you a live dashboard instead. Open a tab. Everything's there.

<p align="center">
  <img src="./screenshots/dashboard-mobile.png" alt="Velboard" width="600">
</p>

---

## What you get on day one

<table>
<tr>
<td align="center" width="25%">⚡ <strong>CPU</strong></td>
<td align="center" width="25%">🧠 <strong>Memory</strong></td>
<td align="center" width="25%">💾 <strong>Disk</strong></td>
<td align="center" width="25%">⏱ <strong>Uptime</strong></td>
</tr>
<tr>
<td align="center">⚙️ <strong>Processes</strong></td>
<td align="center">🔧 <strong>OpenClaw</strong></td>
<td align="center">📊 <strong>Claude Usage</strong></td>
<td align="center">📅 <strong>Cron Jobs</strong></td>
</tr>
<tr>
<td align="center">🤖 <strong>Models</strong></td>
<td align="center" colspan="3">✨ <strong>Whatever you want next</strong></td>
</tr>
</table>

All live. All WebSocket. Nothing stale.

These 9 panels are just what it ships with. They're not the point.

---

## Stop waiting for PRs

Every open source dashboard works the same way. You need a feature. You open an issue. Maybe someone builds it. Maybe they don't. You fork. You maintain a fork. Eventually you give up.

**That era is over.**

Need a panel for your database performance? Tell your agent. Docker container status? Tell your agent. API latency? Stock portfolio? Anything you can pull data for?

Tell your agent. It builds the panel. It shows up on your dashboard.

The framework underneath — [Vel](https://github.com/essdee/vel) — makes sure your agent can't break existing panels when it adds new ones. That's not a suggestion or a best practice. It's enforced. Structurally.

You don't need to know how any of this works. You just need to know what you want to see.

---

## The last dashboard you'll ever install

See a dashboard on GitHub with a feature you like? Send your agent a screenshot and say *"add this."*

Have an idea in your head? Describe it.

Your agent builds it. The framework makes sure it works. It appears on your dashboard.

**These 9 panels took an afternoon. Yours take a message.**

Keep your custom panels in your own repo if you want. Or contribute them back. The framework doesn't care — it discovers what's there and makes it work. No conflicts. No merge hell. No waiting on anyone.

---

## Your agent can act too

Pair [VelReach](https://github.com/karthikeyan5/velreach) and your agent can use *your* browser. A 6-character code, real-time visibility, no passwords shared. Your browser, your sessions, your agent's hands.

📖 **[VelReach →](https://github.com/karthikeyan5/velreach)**

---

## Built on Vel

[Vel](https://github.com/essdee/vel) is an AI-native Go framework. Single binary. Apps compose, they don't conflict. Your agent builds on it — the framework makes sure nothing breaks.

---

## Get started

```bash
cd your-vel-app/apps/
git clone https://github.com/karthikeyan5/velboard.git
cd /path/to/vel && ./vel build && ./vel start
```

---

## License

[MIT](./LICENSE)
