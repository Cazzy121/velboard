# AGENT-EXTEND.md — AI Agent Playbook

**For AI agents:** How to extend the OpenClaw Dashboard Kit on behalf of your human. Create custom panels, override core panels, register hooks, add routes, install plugins, and create themes.

---

## ⚠️ Docs Ship With Code — Mandatory

Every code change **must** include corresponding documentation updates. No exceptions.

- New panel → update AGENT-EXTEND.md with usage example
- Contract change → update CONTRACTS.md
- Architecture change → update architecture.yaml + ARCHITECTURE.md
- New convention → update CONVENTIONS.md
- Breaking change → update BREAKING_CHANGES.md
- README-visible feature → update README.md

**A PR/commit without docs for user-facing changes is incomplete.**

---

## Architecture Overview

```
core/panels/        → Built-in panels (NEVER edit)
custom/panels/      → Your custom panels (git-ignored, you own this)
custom/overrides/   → Override core panels (folder name match = override)
custom/hooks.js     → Register hooks to modify core behavior
custom/routes/      → Custom Express API endpoints
custom/theme/       → CSS overrides
plugins/            → External plugins (git clone)
```

**Override resolution (last wins):**
1. `core/panels/{id}/` — built-in (always available as fallback)
2. `custom/panels/{id}/` — user custom panels
3. `plugins/{name}/panels/{id}/` — plugin panels
4. `custom/overrides/{id}/` — highest priority, overrides everything

---

## 1. Create a Custom Panel

When your human says "add a panel that shows X":

### Step 1: Copy the template

```bash
cp -r core/templates/panel-example custom/panels/my-panel
```

### Step 2: Edit manifest.json

```json
{
  "id": "my-panel",
  "name": "My Panel",
  "version": "1.0.0",
  "contractVersion": "1.0",
  "description": "What this panel shows",
  "author": "agent",
  "position": 100,
  "size": "half",
  "refreshMs": 5000,
  "requires": [],
  "capabilities": ["fetch"],
  "dataSchema": { "type": "object", "properties": {} },
  "config": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Must match folder name. Lowercase, hyphens only. |
| `name` | string | Display name in dashboard |
| `contractVersion` | string | Must be `"1.0"` for Preact+HTM panels |
| `position` | number | Sort order (1=first, 999=last) |
| `size` | string | `"half"` (50% width, 2-column) or `"full"` (100% width) |
| `refreshMs` | number | Data refresh interval in milliseconds |
| `config` | object | Custom config fields (accessible via config.panels.{id}) |

### Step 3: Write api.js (server-side data)

```javascript
// Runs in Node.js on the server
// Receives context: { hooks, config, auth, panel }
//   - panel: { id, manifest, cls, config } for this panel
// Must return: { endpoint: string, handler: async (req, res) => void }

module.exports = ({ hooks, config, auth, panel }) => ({
  endpoint: `/api/panels/${panel.id}`,
  handler: async (req, res) => {
    // Auth check (required for all panel endpoints)
    const user = auth.check(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    // Your data logic here
    const data = {
      value: 42,
      label: 'My Metric',
      timestamp: Date.now()
    };

    // Optional: let hooks modify data before sending
    const filtered = await hooks.filter(`panel.${panel.id}.data`, data, { user });
    res.json(filtered);
  }
});
```

### Step 4: Write ui.js (browser-side Preact+HTM component)

```javascript
// Runs in the browser as a Preact+HTM component
// Import from the vendored bundle — no CDN, no build step
import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

// Export default function component. PascalCase of panel id.
export default function MyPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  if (!data) return html`<div class=${cls('wrap')}><div class=${cls('label')}>Loading...</div></div>`;

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <div class=${cls('label')}>${data.label}</div>
      <div class=${cls('value')}>${data.value}</div>
    </div>
  `;
}
```

### Rules for ui.js

1. **Import:** Always from `/core/vendor/preact-htm.js` — never from a CDN
2. **Export:** `export default function` — named export of the component
3. **Props:** `{ data, error, connected, lastUpdate, api, config, cls }`
4. **`cls()` helper:** Use `cls('name')` for scoped class names (generates `p-{panelId}-name`)
5. **Use CSS variables** from core.css for consistent theming (see below)
6. **Handle null data** — component renders before first data arrives, always check

### Step 5: Write test.js (co-located unit test)

Every panel should have a `test.js` alongside `api.js` and `ui.js`:

```javascript
// my-panel/test.js
const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');

describe('my-panel', () => {
  it('returns data when authed', async () => {
    const api = require('./api.js');
    const mockAuth = { check: () => ({ id: 1 }) };
    const mockHooks = { filter: async (_, d) => d };
    const { handler } = api({ hooks: mockHooks, config: {}, auth: mockAuth, panel: { id: 'my-panel' }, deps: {} });

    const res = { json: mock.fn(), status: mock.fn(() => res) };
    await handler({}, res);
    assert.ok(res.json.mock.calls.length > 0);
  });

  it('returns 403 when auth fails', async () => {
    const api = require('./api.js');
    const mockAuth = { check: () => null };
    const { handler } = api({ hooks: {}, config: {}, auth: mockAuth, panel: { id: 'my-panel' }, deps: {} });

    const res = { json: mock.fn(), status: mock.fn(() => res) };
    await handler({}, res);
    assert.equal(res.status.mock.calls[0].arguments[0], 403);
  });
});
```

**Testing convention:** All tests use `node:test` + `node:assert`. Run with `npm test`. Tests are co-located next to the code they test.

### Available CSS Variables

See `core/public/core.css` for the full list. Key variables:

```css
var(--bg)          /* #06060e — page background */
var(--bg2)         /* #0c0c18 — slightly lighter bg */
var(--card)        /* #10101e — card background */
var(--card-border) /* rgba(accent, 0.08) */
var(--accent)      /* from config.json accent field */
var(--accent-dim)  /* accent at 15% opacity */
var(--text)        /* #e8e8f0 — primary text */
var(--text-dim)    /* #6a6a7a — secondary text */
var(--text-mid)    /* #9a9aaa — mid text */
var(--red)         /* #ef4444 */
var(--green)       /* #4ade80 */
var(--yellow)      /* #fbbf24 */
var(--cyan)        /* #22d3ee */
```

---

## 2. Override a Core Panel

When your human says "redesign the CPU panel":

```bash
# Copy the core panel's ui.js to overrides
mkdir -p custom/overrides/cpu
cp core/panels/cpu/ui.js custom/overrides/cpu/ui.js

# Edit the copy — optionally copy manifest.json too for different config
```

Your override replaces the core panel's UI but keeps the core API (data source).
To override the API too, copy api.js as well.
To fully replace everything, copy all 3 files (manifest + api + ui).

**To revert:** Delete the folder in custom/overrides/.

---

## 3. Register Hooks

Create `custom/hooks.js` to modify core behavior:

```javascript
// custom/hooks.js
// Receives the hooks engine + context ({ config, auth })
// All hooks are optional — only register what you need

module.exports = (hooks, { config, auth }) => {

  // --- FILTERS (modify data passing through) ---

  // Add temperature to CPU data
  hooks.addFilter('panel.cpu.data', async (data) => {
    data.temperature = '45°C'; // Add custom field
    return data; // Must return modified data
  });

  // Reorder panels
  hooks.addFilter('panels.order', (panels) => {
    // Move claude-usage to position 1
    return panels.sort((a, b) => a.id === 'claude-usage' ? -1 : 0);
  });

  // Modify WebSocket payload before it's sent to clients
  hooks.addFilter('ws.payload', (payload) => {
    payload.customField = 'hello';
    return payload;
  });

  // --- ACTIONS (fire-and-forget events) ---

  // Run code when server starts
  hooks.on('core.server.init', (app, config) => {
    console.log('Server initializing...');
  });

  // Run code when server is ready
  hooks.on('core.server.ready', (server, config) => {
    console.log('Server listening!');
  });

  // React to cron actions from the UI
  hooks.on('cron.action', ({ jobId, action, result }) => {
    console.log(`Cron ${action} on ${jobId}: ${result}`);
  });
};
```

### Available Hooks

| Hook Name | Type | Arguments | Description |
|-----------|------|-----------|-------------|
| `core.server.init` | action | `(app, config)` | Express app created, register routes |
| `core.server.ready` | action | `(server, config)` | Server listening |
| `core.panels.discovered` | action | `(registry)` | All panels found |
| `core.panels.order` | filter | `(panels, config)` | Modify panel display order |
| `panel.{id}.data` | filter | `(data, { user })` | Modify panel API response |
| `ws.payload` | filter | `(payload)` | Modify WebSocket message |
| `config.loaded` | filter | `(config)` | Modify config after loading |
| `auth.validated` | action | `(user, method)` | User authenticated |
| `cron.action` | action | `({jobId, action, result})` | Cron job action from UI |
| `update.available` | action | `(versionInfo)` | New version detected |

---

## 4. Add Custom Routes

Create files in `custom/routes/` — each file exports an Express router setup:

```javascript
// custom/routes/my-api.js

module.exports = (app, { hooks, config, auth }) => {
  // Add a custom GET endpoint
  app.get('/api/custom/hello', (req, res) => {
    const user = auth.check(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });
    res.json({ hello: 'world', user: user.first_name });
  });

  // Add a custom POST endpoint
  app.post('/api/custom/do-something', (req, res) => {
    const user = auth.check(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });
    // Your logic here
    res.json({ ok: true });
  });
};
```

Routes are auto-loaded at startup. No registration needed — just create the file.

---

## 5. Install a Plugin

Plugins are external git repos with the same structure:

```bash
cd plugins/
git clone https://github.com/someone/openclaw-panel-docker docker-panel
```

Or add to config.json for the updater to manage:

```json
{
  "plugins": [
    { "name": "docker-panel", "repo": "https://github.com/someone/openclaw-panel-docker" }
  ]
}
```

### Plugin structure

```
plugins/docker-panel/
├── manifest.json       ← Plugin metadata + requirements
├── panels/
│   └── docker/
│       ├── manifest.json
│       ├── api.js
│       └── ui.js
├── hooks.js            ← Optional hooks
└── routes/             ← Optional custom routes
    └── docker-api.js
```

### Plugin manifest.json

```json
{
  "id": "docker-panel",
  "name": "Docker Containers",
  "version": "1.0.0",
  "description": "Shows running Docker containers",
  "author": "community-user",
  "homepage": "https://github.com/someone/openclaw-panel-docker",
  "requires": { "dashboard": ">=2.0.0" },
  "panels": ["docker"],
  "hooks": true,
  "routes": true
}
```

---

## 6. Create a Theme

Create `custom/theme/theme.css` to override any CSS variable:

```css
/* custom/theme/theme.css */
/* Loaded AFTER core.css — your values win */

:root {
  /* Change accent to red */
  --color-accent: #e94560;
  --color-accent-dim: rgba(233, 69, 96, 0.15);
  --color-accent-glow: rgba(233, 69, 96, 0.3);

  /* Change background */
  --color-bg: #0a0a12;

  /* Change fonts */
  --font-heading: 'Outfit', sans-serif;
}
```

For more advanced theming, see `core/templates/theme-example/`.

---

## Error Handling

- If your panel's api.js throws → returns `{ error: 'Panel API error' }` (doesn't crash server)
- If your panel's ui.js throws → ErrorBoundary catches it and shows error card
- If your hooks.js throws → logged to console, other hooks continue
- If your route throws → returns 500, doesn't crash server

**The dashboard never goes down because of custom/plugin code.**

---

## Testing Your Panel

```bash
# 1. Run unit tests (co-located test.js files)
npm test

# 2. Run smoke tests (integration — all endpoints)
npm run smoke

# 3. Start the server for manual testing
BOT_TOKEN=your-token node core/server.js

# 4. Test your API endpoint
curl http://localhost:3700/api/panels/my-panel

# 5. Open the dashboard in browser
# Your panel should appear in the grid
```

---

## Conventions (Follow These)

1. **NEVER edit anything in `core/`** — use custom/ or plugins/
2. **Panel IDs:** lowercase, hyphens only (e.g. `my-panel`, not `myPanel`)
3. **UI components:** Preact+HTM, import from `/core/vendor/preact-htm.js`, `export default function`
4. **API endpoints:** `/api/panels/{id}` for panel data
5. **Always check auth** in api.js handlers
6. **Always handle null data** in ui.js
7. **Use CSS variables** for colors/fonts — don't hardcode
8. **Use `cls()`** for scoped class names — never raw class strings
9. **Return data from filters** — forgetting `return` silently drops the data
10. **Keep manifests accurate** — the shell relies on them for layout
11. **Write tests** — co-located test.js using `node:test` + `node:assert`
12. **Test before deploying** — `npm test` then `npm run smoke`

---

## Taking Screenshots for README

Need screenshots of your dashboard for docs or a README? The live dashboard requires Telegram auth and loads external widgets, making headless browser screenshots tricky. Here's the pattern:

1. **Create static pre-rendered HTML** — Pure HTML+CSS with hardcoded realistic data. No JavaScript, no WebSocket, no `fetch()`, no iframes, no Telegram widgets. Just a pixel-perfect replica of the UI with fake data baked in.

2. **Serve via `custom/routes/`** — Create a route like `custom/routes/screenshots.js` that serves a `custom/screenshots/` directory as static files:
   ```javascript
   const express = require('express');
   const path = require('path');
   module.exports = (app) => {
     app.use('/screenshots', express.static(
       path.resolve(__dirname, '..', 'screenshots'),
       { dotfiles: 'deny' }
     ));
   };
   ```

3. **Screenshot with headless browser** — Use Playwright/Puppeteer with a mobile viewport (e.g. 390×844 for iPhone 14 Pro):
   ```javascript
   const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
   const page = await ctx.newPage();
   await page.goto('https://your-domain/screenshots/landing.html');
   await page.screenshot({ path: 'landing-mobile.png', fullPage: true });
   ```

4. **Or screenshot manually** — Open the URL on your phone and take a native screenshot. This gives the most authentic result.

**Why this works:** Avoids all auth issues, widget loading failures, WebView quirks, and font/icon loading race conditions. The static pages use the exact same CSS classes as the real dashboard, so they look identical.
