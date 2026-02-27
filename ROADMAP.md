# Clawboard Roadmap

Clawboard is a panel pack for [Vel](https://github.com/essdee/vel). This roadmap covers **panels and OpenClaw-specific features**. For framework features (store, pages, roles, events), see the [Vel Roadmap](https://github.com/essdee/vel/blob/main/ROADMAP.md).

---

## v1.0 — Monitoring Dashboard ✅ (Current)

9 panels for OpenClaw agent monitoring:
- System: CPU, Memory, Disk, Uptime, Processes
- OpenClaw: Status, Cron Jobs, Models
- Claude: Usage quotas with reset timers

## v1.1 — Enhanced Panels (Planned)

- [ ] **Network panel** — bandwidth, connections, latency
- [ ] **Logs panel** — tail OpenClaw logs with filtering
- [ ] **Tasks panel** — active sub-agents, session list
- [ ] **Cost panel** — token usage, estimated spend per day/week/month
- [ ] Interactive cron editor (create/edit crons from dashboard)

## v1.2 — Multi-Agent (Planned)

- [ ] Monitor multiple OpenClaw agents from one dashboard
- [ ] Agent selector in UI
- [ ] Cross-agent metrics comparison

## v2.0 — Management (Planned, requires Vel v2 store)

- [ ] Session management — view, send messages, kill sessions
- [ ] Memory browser — read/edit agent memory files
- [ ] Config editor — modify agent config from dashboard
- [ ] Scheduled reports — daily/weekly email summaries
