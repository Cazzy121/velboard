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
└── test.js          ← OPTIONAL (ESM)
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
      "cpu": { "type": "number" },
      "cores": { "type": "integer" }
    },
    "required": ["cpu"]
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

    const data = { cpu: getCpuUsage(), cores: os.cpus().length };
    const filtered = await hooks.filter(`panel.${panel.id}.data`, data, { user });

    res.json(filtered);
  }
});
```

**Rules:**
- `module.exports` = function receiving context, returning `{ endpoint, handler }`
- `endpoint` MUST be `/api/panels/{id}`
- Handler MUST call `auth.check(req)` first
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
| `api` | `object` | Injected helpers. v2: `{ fetch }`. v3+: adds `store`. v4+: adds `agent`. |
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

### test.js (Optional, ESM)
```js
import { strict as assert } from 'node:assert';

export const fixtures = [
  { name: 'normal', data: { cpu: 45, cores: 4 } },
  { name: 'high', data: { cpu: 95, cores: 8 } },
  { name: 'null-data', data: null },
];

export const assertions = (html, fixture) => {
  if (fixture.data === null) {
    assert(html.includes('Loading'), 'should show loading state');
    return;
  }
  assert(html.includes(fixture.data.cpu + '%'), `should contain ${fixture.data.cpu}%`);
};
```

**Rules:**
- `fixtures` = array of `{ name: string, data: object|null }`. Must include a `null` fixture.
- `assertions` = function `(renderedHtml: string, fixture: object) => void`. Uses Node `assert`.
- Core test runner: renders each fixture via `preact-render-to-string`, runs assertions.

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
/* Use CSS variables — never hardcode colors */
:root { --bg, --card, --accent, --text, --text-dim, --green, --yellow, --red }

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
| `test.js` | ESM (`export`) | Matches ui.js for consistency |
| `routes/*.js` | CommonJS | Server-side |
| `hooks.js` | CommonJS | Server-side |

This split is intentional. Don't "fix" it.

---

## Breaking Changes (what bumps contractVersion to 2.0)

- Adding required fields to manifest.json
- Changing ui.js props shape (adding is OK, removing/renaming is breaking)
- Changing api.js context shape
- Changing hook naming convention
- Changing `cls()` behavior
- Changing reserved route prefixes
- Changing CSS variable names

---

*Locked: 2026-02-26. Version 1.0.*
