# Clawboard Contracts v1.0

> **LOCKED.** Breaking these = major version bump. Read before writing any panel, plugin, hook, or route.

---

## Panel Contract

### File Structure
```
{panel-id}/
├── manifest.json    ← REQUIRED
├── api.js           ← REQUIRED (CommonJS)
├── ui.js            ← REQUIRED (ESM, Preact+HTM)
└── test.js          ← OPTIONAL (CommonJS)
```

`{panel-id}` = folder name = manifest id = API route segment.

### manifest.json
```json
{
  "id": "cpu",
  "contractVersion": "1.0",
  "name": "CPU Load",
  "description": "Real-time CPU usage and core count",
  "version": "1.0.0",
  "author": "core",
  "position": 10,
  "size": "half",
  "refreshMs": 2000,
  "requires": [],
  "capabilities": ["fetch"],
  "dataSchema": {
    "type": "object",
    "properties": {
      "load": { "type": "number" },
      "cores": { "type": "integer" }
    },
    "required": ["load", "cores"]
  },
  "rateLimit": {
    "windowMs": 60000,
    "max": 30
  },
  "config": {}
}
```

| Field | Required | Rule |
|-------|----------|------|
| `id` | ✅ | Must match folder name |
| `contractVersion` | ✅ | `"1.0"` — core rejects unknown |
| `name` | ✅ | Max 30 chars |
| `description` | ✅ | Max 100 chars |
| `version` | ✅ | Semver |
| `author` | ✅ | `"core"` or author name |
| `position` | ✅ | Hint, not guarantee. Core: 10-90. Custom: 100+. Plugin: 200+. Tiebreak: alphabetical by id. User `panels.order` in config.json always wins. |
| `size` | ✅ | `"half"` or `"full"` |
| `refreshMs` | ✅ | Min 1000, max 300000 |
| `requires` | ✅ | Dependency IDs. Empty array = none |
| `capabilities` | ✅ | What the panel needs from `api` prop: `["fetch"]` for v2. `["fetch", "store"]` for v3+. Core validates against current version. |
| `dataSchema` | ✅ | JSON Schema for api.js response. Validated at startup + TEST_MODE. Skipped in production runtime. |
| `rateLimit` | ❌ | Per-panel rate limit. Default: 30/min |
| `config` | ❌ | Custom config, accessible via `config.panels.{id}` |

### api.js (CommonJS)
```js
module.exports = ({ hooks, config, auth, panel }) => ({
  endpoint: `/api/panels/${panel.id}`,

  handler: async (req, res) => {
    const user = auth.check(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    // Your data logic here (see core/panels/cpu/api.js for a real example)
    const si = require('systeminformation');
    const cpu = await si.currentLoad();
    const data = { load: Math.round(cpu.currentLoad * 10) / 10, cores: cpu.cpus?.length || 0 };
    const filtered = await hooks.filter(`panel.${panel.id}.data`, data, { user });

    res.json(filtered);
  }
});
```

**Rules:**
- `module.exports` = function receiving `{ hooks, config, auth, panel }`, returning `{ endpoint, handler }`
- `endpoint` MUST be `/api/panels/{id}`
- Handler MUST call `auth.check(req)` first (supports both cookie auth and Mini App `initData` POST body)
- Return MUST match `dataSchema`
- Use `hooks.filter()` before responding
- No side effects outside handler. No global state. No timers.

### ui.js (ESM, Preact+HTM)
```js
import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

export default function CpuPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  if (!data) return html`<div class=${cls('loading')}>Loading...</div>`;

  return html`
    ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
    <div class=${cls('metric')}>${data.cpu}%</div>
    <div class=${cls('cores')}>${data.cores} cores</div>
  `;
}
```

**Props contract:**
| Prop | Type | Description |
|------|------|-------------|
| `data` | `object\|null` | Latest data from api.js. `null` before first load. Matches `dataSchema`. |
| `error` | `{error: string, code?: string, retry?: boolean}\|null` | Error from api.js or core. |
| `connected` | `boolean` | WebSocket alive? |
| `lastUpdate` | `number\|null` | Timestamp (ms) of last data push. |
| `api` | `object` | Injected helpers. v2: `{ fetch }`. v3+: adds `store`. v4+: adds `navigate`. v6+: adds `emit/on/state/files`. |
| `config` | `object` | Panel config from `config.panels.{id}`. |
| `cls` | `(name) => string` | Scoped class helper. `cls('metric')` → `'p-cpu-metric'`. |

**Rules:**
- `export default` = Preact function component
- Component name = PascalCase of panel-id: `cpu` → `CpuPanel`, `claude-usage` → `ClaudeUsagePanel`
- Import ONLY from `/core/vendor/preact-htm.js`
- Use `cls()` for all CSS classes — never hardcode `.p-` prefix
- Handle `data === null` (loading) and `error` (failure) gracefully
- No direct DOM manipulation
- Shared sub-components accept `className` prop, not `cls()`

### test.js (Optional, CommonJS)
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mockContext, callHandler } = require('../../test-utils');

describe('cpu panel', () => {
  it('api returns valid data shape', async () => {
    const ctx = mockContext({ panel: { id: 'cpu', manifest: {} } });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.equal(typeof data.load, 'number');
    assert.equal(typeof data.cores, 'number');
  });

  it('returns 403 when auth fails', async () => {
    const ctx = mockContext({
      panel: { id: 'cpu', manifest: {} },
      auth: { check: () => null },
    });
    const api = require('./api.js')(ctx);
    const { statusCode } = await callHandler(api.handler);
    assert.equal(statusCode, 403);
  });
});
```

**Rules:**
- Uses `node:test` + `node:assert/strict` (CommonJS, matches api.js)
- Use `mockContext()` and `callHandler()` from `core/test-utils.js`
- Test the API handler: valid data shape, auth rejection, hook application
- Run with `npm test`

---

## Hook Contract

```js
// All hooks are async. Always await.
const filtered = await hooks.filter('panel.cpu.data', data, context);
await hooks.action('core.server.ready', { port });
```

**Naming:** `{scope}.{target}.{action}` — always 3 segments.
- `core.*` — reserved for core
- `panel.*` — panel hooks
- `custom.*` — custom hooks
- `plugin.{name}.*` — plugin hooks

**Filters:** modify and return data. If handler returns `undefined`, it's skipped (previous value kept). `null` is a valid intentional return.

**Actions:** side effects only, return ignored.

---

## Route Contract

```js
// custom/routes/{name}.js (CommonJS)
module.exports = (app, { hooks, config, auth }) => {
  app.get('/api/custom/my-thing', (req, res) => {
    const user = auth.check(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });
    res.json({ ok: true });
  });
};
```

**Rules:**
- Custom API routes: `/api/custom/` prefix
- Reserved prefixes (don't use): `/api/panels/`, `/auth/`, `/ws/`, `/public/`, `/dashboard`
- Static routes: any prefix except reserved ones
- Auth required for data endpoints

---

## CSS Contract

```css
/* Use CSS variables — never hardcode colors (see core/public/core.css for full list) */
:root { --bg, --bg2, --card, --card-border, --accent, --accent-dim, --accent-glow, --text, --text-dim, --text-mid, --green, --green-dim, --yellow, --yellow-dim, --red, --red-dim, --cyan, --cyan-dim }

/* Prefixes */
.p-{panel-id}-{name}    /* Panels (use cls() helper) */
.plg-{plugin-name}-{name}  /* Plugins */
.c-{name}               /* Core (reserved) */
```

**Rules:**
- Use `cls()` helper in panels — generates correct prefix
- Always use CSS variables for colors
- No `!important` (except theme overrides)
- No global selectors in panels (`body`, `*`, `div`)
- Convention: keep panel CSS under 50KB

---

## Error Contract

When api.js fails, core wraps the error:
```json
{ "error": "Human-readable message", "code": "OPTIONAL_CODE", "retry": true }
```
Passed to ui.js as `error` prop. Panels should render error state, not crash.

---

## WebSocket Data Flow

Built-in panels receive live data via WebSocket (2-second interval). The server pushes data for all core panels in a single message.

**Custom panels do NOT receive WebSocket updates.** Custom panels must poll their own `/api/panels/{id}` endpoint using the `api.fetch()` prop. This is a known limitation — v3+ may add a registration mechanism for custom panel WebSocket data.

## `refreshMs` — Currently Informational

The `refreshMs` field in manifest.json is part of the contract but currently has no effect on the server. All core panels receive data at a fixed 2-second WebSocket interval. Custom panels control their own refresh via `api.fetch()`. Per-panel refresh intervals are planned for a future version.

## Core Guarantees

1. **Panels are unmounted, never hidden.** `useEffect` cleanup always runs.
2. **Schema validation at startup + TEST_MODE.** Skipped in production runtime.
3. **Filter chain is defensive.** `undefined` returns are skipped, not propagated.
4. **Position is a hint.** Tiebreak: alphabetical. User `panels.order` overrides all.
5. **`/core/vendor/preact-htm.js` always available.** Vendored, no CDN dependency.

---

## Module System

| File | Module | Why |
|------|--------|-----|
| `api.js` | CommonJS (`module.exports`) | Node.js Express = CJS native |
| `ui.js` | ESM (`export default`) | Browser = ESM native |
| `test.js` | CommonJS (`require`) | Matches api.js (tests test the API) |
| `routes/*.js` | CommonJS | Server-side |
| `hooks.js` | CommonJS | Server-side |

This split is intentional. Don't "fix" it.

---

## Forward Compatibility Notes

These are **non-breaking** and may happen in minor versions:

1. **New `api` prop methods** — v3 adds `store`, v4 adds `navigate`, v6 adds `emit/on/state/files`. Panels that don't use new methods are unaffected. All v6 interaction APIs (events, shared state) go through the `api` prop — no new top-level props.
2. **New reserved route prefixes** — Core may reserve new prefixes (e.g., `/api/store/`, `/api/files/`). Custom routes using `/api/custom/` prefix are always safe.
3. **New CSS variables** — Core may add variables (e.g., `--input-bg`, `--sidebar-width`). Existing variables won't change names.
4. **Vendor bundle growth** — `core/vendor/preact-htm.js` may include additional Preact ecosystem modules (e.g., router for v4, signals for v6). Existing imports remain stable.
5. **New manifest.json fields** — Optional fields may be added (e.g., `forms` for v3, `permissions` for v5). Existing manifests without new fields continue to work.
6. **New capabilities** — The `capabilities` list grows per version. Core validates that requested capabilities are available in the current version.

---

## Breaking Changes (what bumps contractVersion to 2.0)

- Adding required fields to manifest.json
- Changing ui.js props shape (adding is OK, removing/renaming is breaking)
- Changing api.js context shape (adding new fields is non-breaking, like ui.js props; removing or renaming existing fields is breaking)
- Changing hook naming convention
- Changing `cls()` behavior
- Changing reserved route prefixes
- Changing CSS variable names

---

*Locked: 2026-02-26. Version 1.0.*
