# OpenClaw Dashboard Kit — Roadmap

## Architecture: Path A (Dashboard-first, App-capable)

Each version adds one layer. Panels and plugins written for v2 will work in v6.

---

### v2 — Modular Dashboard ✅ (Current)
**Adds:** Panel architecture + hook system + custom folder + error boundaries + templates

**You can build:** Read-only dashboards, monitoring, live metrics, status pages

**Core:**
- 9 built-in panels (CPU, Memory, Disk, Uptime, Processes, Claude Usage, Crons, Models, OpenClaw Status)
- WordPress-style hooks (actions + filters)
- Panel contract: manifest.json + api.js + ui.js (Preact+HTM components)
- Override system: custom/overrides/ folder name match = override
- Plugin support: git clone into plugins/
- Error boundaries: bad panel → fallback to core, dashboard never crashes
- Auto-update: git pull core/, safety checks, opt-in

**Schema seed (v2.2):**
- Elm-quality validation errors in `panels.js` — every error tells you what's wrong, how to fix it, and shows a reference
- Validation logic structured as discrete functions ready for v3 extraction to `core/schema/panels.js`

---

### v3 — Interactive Apps (Planned)
**Adds:** SQLite store + forms + CRUD operations + `core/schema/` + `clawboard doctor` CLI

**You can build:** Todo apps, trackers, note-taking, simple data management

**Store contract:**
```javascript
store.get('todos', id)
store.list('todos', { filter, sort, page })
store.create('todos', data)
store.update('todos', id, data)
store.delete('todos', id)
```

**Form contract:**
```javascript
// Panel declares forms in manifest.json
"forms": {
  "create": {
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "due", "type": "date" },
      { "name": "priority", "type": "select", "options": ["low", "medium", "high"] }
    ]
  }
}
```

**Key decisions:**
- Default store: SQLite (zero setup, single file)
- Swappable adapters: PostgreSQL, MySQL for production scale
- Panels declare data schema in manifest.json
- Auto-migration when schemas change
- Core renders forms from JSON schema, validates, handles submission

**Schema (v3):**
- Extract validation from `panels.js` into `core/schema/panels.js`
- Add `core/schema/store.js` for store declaration validation
- Add `core/schema/loader.js` (builds state snapshot for validators)
- Add `core/schema/index.js` (composes modules, runs two-phase validation)
- `clawboard doctor` CLI — run validation without starting server, usable as CI gate

---

### v4 — Multi-Page Apps (Planned)
**Adds:** Routing + pages + sidebar navigation + `/api/schema` introspection

**You can build:** Multi-page apps, wikis, project management tools

**Page concept:**
```json
{
  "pages": {
    "dashboard": { "panels": ["cpu", "memory", "disk"], "icon": "📊" },
    "todos": { "panels": ["todo-list", "todo-stats"], "icon": "✅" },
    "erp": {
      "pages": {
        "invoices": { "panels": ["invoice-list"] },
        "vendors": { "panels": ["vendor-list"] }
      }
    }
  }
}
```

- Sidebar/tab navigation auto-generated from config
- URL routing: /dashboard, /todos, /erp/invoices
- Breadcrumbs for nested pages
- Panel lazy-loading (only load panels for current page)

**Schema (v4):**
- Add `core/schema/pages.js` for page route and panel-page binding validation
- `GET /api/schema` — live introspection endpoint exposing system state to external tools

---

### v5 — Team Apps (Planned)
**Adds:** Roles + permissions

**You can build:** Team workspaces, shared apps, basic ERP

**Role-based access:**
```json
{
  "roles": {
    "admin": { "users": [123], "access": "*" },
    "manager": { "users": [456], "access": ["dashboard", "erp.*"] },
    "team": { "users": [789], "access": ["todos.own", "dashboard"] }
  }
}
```

- Panels declare required permission in manifest
- Core filters pages/panels based on user role
- Row-level security for store queries (own vs all)

**Schema (v5):**
- Add `core/schema/roles.js` for role definitions, permission trees, inheritance validation

---

### v6 — Full Platform (Planned)
**Adds:** Inter-panel events + search + file handling + notifications

**You can build:** Full ERP, CRM, document management, any business app

- **Event bus:** `ctx.emit('invoice.created', data)` / `ctx.on('invoice.created', handler)`
- **Shared state:** `ctx.state.set('selectedDate', '2026-02-25')` — reactive, all panels update
- **Search:** Core search endpoint across all panel stores, SQLite FTS5
- **Files:** Upload endpoint, data/files/ storage, panel API for attachments
- **Notifications:** Server push → WebSocket + OpenClaw message tool (Telegram/Discord/etc.)

**Schema (v6):**
- Add `core/schema/events.js` for event emitter/listener graph validation, circular dependency detection
- Add `core/schema/files.js` for file access declaration validation

---

## Design Principles (All Versions)

1. **Config over code** — Users customize via config.json, never edit core/
2. **Convention over configuration** — Predictable file locations, consistent contracts
3. **AI-agent-first** — Manifest-driven, template-rich, validation built in
4. **Graceful degradation** — Bad plugin → error card → fallback to core
5. **Forward compatible** — v2 plugins work in v6 without changes
6. **Zero build step** — No webpack, no bundler, just Node.js + browser ES modules
