/**
 * OpenClaw Dashboard Kit v2.2 — Core Server
 * 
 * Modular panel architecture with async hooks + contract v1.0
 * Preserves ALL functionality from v1
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const cookieParser = require('cookie-parser');
const { WebSocketServer } = require('ws');
const rateLimit = require('express-rate-limit');
const { getSystemMetrics, getUsageData, getSystemStatus, getAgentInfo, getCronJobs } = require('./lib/data');

// Load core modules
const hooks = require('./lib/hooks');
const auth = require('./lib/auth');
const panels = require('./lib/panels');
const updater = require('./lib/updater');
const { validateManifest } = require('./lib/validator');

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');

// ── TEST_MODE warning ──
if (process.env.TEST_MODE === 'true') {
  console.warn('\n⚠️  TEST_MODE is enabled — auth bypassed, schema validation active');
  console.warn('⚠️  Do NOT use in production.\n');
}

// ── Load Config ──
let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  console.log('[Config] Loaded config.json');
} catch (err) {
  console.error('[Config] Failed to load config.json:', err.message);
  console.error('[Config] Copy config.example.json to config.json and configure it');
  process.exit(1);
}

// ── Load BOT_TOKEN from environment ──
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('[Fatal] BOT_TOKEN environment variable is required');
  console.error('[Fatal] Set it in .env file or systemd service');
  process.exit(1);
}

// ── Initialize auth ──
auth.init(BOT_TOKEN, config.allowedUsers || []);

// ── Persistent cookie secret ──
const COOKIE_SECRET_FILE = path.join(ROOT_DIR, '.cookie-secret');
let COOKIE_SECRET;
try {
  COOKIE_SECRET = fs.readFileSync(COOKIE_SECRET_FILE, 'utf8').trim();
} catch {
  COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(COOKIE_SECRET_FILE, COOKIE_SECRET, { mode: 0o600 });
  console.log('[Auth] Generated new cookie secret');
}

// ── Load version info ──
updater.loadVersion(ROOT_DIR);

// ── Express app setup ──
const app = express();
const server = http.createServer(app);
const PORT = config.port || 3700;

// Fire server.init hook
hooks.action('core.server.init', app, config);

// Middleware
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true
});
app.use('/api/', apiLimiter);

// Static files (core/public/)
app.use('/public', express.static(path.join(ROOT_DIR, 'core', 'public')));

// Serve vendored JS
app.use('/core/vendor', express.static(path.join(ROOT_DIR, 'core', 'vendor'), {
  setHeaders: (res) => res.setHeader('Content-Type', 'application/javascript')
}));

// ── Discover and register panels ──
console.log('\n[Panels] Discovering panels...');
const { registry: panelRegistry, report: panelReport } = panels.discoverPanels(ROOT_DIR);

// Startup validation report
console.log(`\n┌─ Panel Report ────────────────────────`);
console.log(`│ Loaded: ${panelReport.loaded.length}`);
for (const p of panelReport.loaded) {
  console.log(`│   ✓ ${p.id} (${p.source}) v${p.version}`);
}
if (panelReport.skipped.length > 0) {
  console.log(`│ Legacy (no contract): ${panelReport.skipped.length}`);
  for (const p of panelReport.skipped) {
    console.log(`│   ⚠ ${p.id} (${p.source}) — ${p.reason}`);
  }
}
if (panelReport.failed.length > 0) {
  console.log(`│ Failed: ${panelReport.failed.length}`);
  for (const p of panelReport.failed) {
    const errMsgs = p.errors.map(e => typeof e === 'string' ? e : e.message).join(', ');
    console.log(`│   ✗ ${p.id} (${p.source}) — ${errMsgs}`);
  }
}
console.log(`└────────────────────────────────────────\n`);

// ── Serve panel UI files (ui.js) for browser import ──
app.get('/api/panels/:panelId/ui.js', (req, res) => {
  const panelId = req.params.panelId;
  const panelInfo = panelRegistry.get(panelId);
  if (!panelInfo) return res.status(404).send('Panel not found');
  const uiPath = path.join(panelInfo.path, 'ui.js');
  if (!fs.existsSync(uiPath)) return res.status(404).send('No UI for panel');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(uiPath);
});

// Register panel APIs
console.log('[Panels] Registering API endpoints...');
const context = { hooks, config, auth };
const registeredCount = panels.registerPanelAPIs(app, panelRegistry, context, rateLimit);
console.log(`[Panels] ${registeredCount} API endpoints registered\n`);

// ── TEST_MODE: validate data schemas ──
if (process.env.TEST_MODE === 'true') {
  panels.validateDataSchemas(panelRegistry, context).then(results => {
    if (results.length > 0) {
      console.log('[TEST] Data schema validation:');
      for (const r of results) {
        console.log(`  ${r.valid ? '✓' : '✗'} ${r.panelId}${r.errors.length ? ': ' + r.errors.map(e => e.message).join(', ') : ''}`);
      }
    }
  });
}

// ── Load custom hooks (if exists) ──
const customHooksPath = path.join(ROOT_DIR, 'custom', 'hooks.js');
if (fs.existsSync(customHooksPath)) {
  try {
    const customHooks = require(customHooksPath);
    if (typeof customHooks === 'function') {
      customHooks(hooks, { config, auth });
    }
    console.log('[Hooks] Loaded custom/hooks.js');
  } catch (err) {
    console.error('[Hooks] Error loading custom/hooks.js:', err.message);
  }
}

// ── Load custom routes (if exist) ──
const customRoutesDir = path.join(ROOT_DIR, 'custom', 'routes');
if (fs.existsSync(customRoutesDir)) {
  const routeFiles = fs.readdirSync(customRoutesDir).filter(f => f.endsWith('.js'));
  for (const file of routeFiles) {
    try {
      const routeModule = require(path.join(customRoutesDir, file));
      if (typeof routeModule === 'function') {
        routeModule(app, { hooks, config, auth });
      }
      console.log(`[Routes] Loaded custom/routes/${file}`);
    } catch (err) {
      console.error(`[Routes] Error loading custom/routes/${file}:`, err.message);
    }
  }
}

// ── Load plugin hooks and routes ──
const pluginsDir = path.join(ROOT_DIR, 'plugins');
if (fs.existsSync(pluginsDir)) {
  const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  for (const plugin of pluginDirs) {
    const pluginDir = path.join(pluginsDir, plugin);
    
    const pluginHooksPath = path.join(pluginDir, 'hooks.js');
    if (fs.existsSync(pluginHooksPath)) {
      try {
        const pluginHooks = require(pluginHooksPath);
        if (typeof pluginHooks === 'function') {
          pluginHooks(hooks, { config, auth });
        }
        console.log(`[Hooks] Loaded plugins/${plugin}/hooks.js`);
      } catch (err) {
        console.error(`[Hooks] Error loading plugins/${plugin}/hooks.js:`, err.message);
      }
    }

    const pluginRoutesDir = path.join(pluginDir, 'routes');
    if (fs.existsSync(pluginRoutesDir)) {
      const routeFiles = fs.readdirSync(pluginRoutesDir).filter(f => f.endsWith('.js'));
      for (const file of routeFiles) {
        try {
          const routeModule = require(path.join(pluginRoutesDir, file));
          if (typeof routeModule === 'function') {
            routeModule(app, { hooks, config, auth });
          }
          console.log(`[Routes] Loaded plugins/${plugin}/routes/${file}`);
        } catch (err) {
          console.error(`[Routes] Error loading plugins/${plugin}/routes/${file}:`, err.message);
        }
      }
    }
  }
}

// ── API Routes ──

// Safe config (no secrets)
app.get('/api/config', (req, res) => {
  const { allowedUsers, ...safeConfig } = config;
  res.json(safeConfig);
});

// Panel manifest list (public, no auth per contract)
app.get('/api/panels', (req, res) => {
  const panelList = panels.buildPanelList(panelRegistry, config);
  res.json(panelList);
});

// Auth check (Mini App)
app.post('/api/auth', (req, res) => {
  const { initData } = req.body || {};
  if (!initData) return res.status(401).json({ ok: false });
  const user = auth.validateInitData(initData);
  if (!user || !auth.isAllowed(user.id)) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user: { id: user.id, first_name: user.first_name } });
});

// Auth check (Browser)
app.get('/api/auth', (req, res) => {
  const user = auth.getUserFromCookie(req);
  if (!user || !auth.isAllowed(user.id)) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user });
});

// Version info
app.get('/api/version', (req, res) => {
  res.json(updater.getVersionInfo());
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: updater.getVersionInfo().version });
});

// Action: refresh Claude usage data
app.post('/api/usage/refresh', async (req, res) => {
  const user = auth.check(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    const WORKSPACE = path.resolve(__dirname, '..', '..');
    const scriptPath = path.join(WORKSPACE, 'skills/claude-usage-monitor/scripts/claude-usage-poll.sh');
    await execFileAsync('bash', [scriptPath], {
      timeout: 15000,
      env: { ...process.env, HOME: process.env.HOME || '/home/claw' }
    });
    const { getUsageData } = require('./lib/data');
    const data = getUsageData();
    res.json(data || { error: 'No data after refresh' });
  } catch {
    res.status(500).json({ error: 'Refresh failed' });
  }
});

// Action: run/enable/disable cron jobs
app.post('/api/crons/action', async (req, res) => {
  const user = auth.check(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const { jobId, action } = req.body || {};
  if (!jobId || !action) return res.status(400).json({ error: 'Missing jobId or action' });
  if (!['run', 'enable', 'disable'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  try {
    const { execFileSync } = require('child_process');
    if (action === 'run') {
      execFileSync('openclaw', ['cron', 'run', jobId], { timeout: 10000, encoding: 'utf8' });
    } else if (action === 'enable') {
      execFileSync('openclaw', ['cron', 'update', jobId, '--enabled', 'true'], { timeout: 5000, encoding: 'utf8' });
    } else if (action === 'disable') {
      execFileSync('openclaw', ['cron', 'update', jobId, '--enabled', 'false'], { timeout: 5000, encoding: 'utf8' });
    }
    res.json({ ok: true, action, jobId });
  } catch {
    res.status(500).json({ error: 'Action failed' });
  }
});

// ── Pages ──
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'core', 'public', 'landing.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'core', 'public', 'shell.html'));
});

// Telegram Login Widget callback
app.get('/auth/telegram/callback', authLimiter, (req, res) => {
  const params = req.query;
  if (!params.hash || !params.id) return res.status(400).send('Invalid login data');
  
  try {
    if (!auth.validateTelegramLogin(params)) return res.status(401).send('Authentication failed');
  } catch {
    return res.status(401).send('Authentication failed');
  }

  const authDate = parseInt(params.auth_date || '0', 10);
  if (Math.floor(Date.now() / 1000) - authDate > 86400) return res.status(401).send('Login expired');
  
  const userId = parseInt(params.id, 10);
  if (!auth.isAllowed(userId)) return res.status(403).send('Access denied');

  const userInfo = JSON.stringify({
    id: userId,
    first_name: params.first_name || '',
    username: params.username || ''
  });

  res.cookie('tg_user', userInfo, {
    signed: true,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect('/dashboard');
});

// Logout
app.get('/auth/logout', (req, res) => {
  res.clearCookie('tg_user');
  res.redirect('/');
});

// ── WebSocket for live metrics ──
const wss = new WebSocketServer({ server, path: '/ws/metrics' });

wss.on('connection', (ws) => {
  let authenticated = false;
  let interval = null;

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'auth') {
        let user = null;
        if (data.initData) {
          user = auth.validateInitData(data.initData);
        } else if (data.cookieAuth) {
          user = data.user;
        }
        if (user && auth.isAllowed(user.id)) {
          authenticated = true;
          ws.send(JSON.stringify({ type: 'auth', ok: true }));

          const sendMetrics = async () => {
            if (ws.readyState !== 1) {
              clearInterval(interval);
              return;
            }
            try {
              const metrics = await getSystemMetrics();
              const usageData = getUsageData();
              const agentInfo = getAgentInfo();
              const cronJobs = getCronJobs();

              // Build per-panel data for new contract panels
              const panelData = {};
              for (const [panelId, panelInfo] of panelRegistry.entries()) {
                // Map legacy metrics to panel data
                const m = panelInfo.manifest;
                if (!m) continue;
                switch (panelId) {
                  case 'cpu': panelData.cpu = metrics.cpu ? { load: metrics.cpu.load, cores: metrics.cpu.cores } : null; break;
                  case 'memory': panelData.memory = metrics.memory || null; break;
                  case 'disk': panelData.disk = metrics.disk || null; break;
                  case 'uptime': panelData.uptime = { uptime: metrics.uptime, hostname: metrics.hostname } ; break;
                  case 'processes': panelData.processes = metrics.processes ? { ...metrics.processes, os: metrics.os } : null; break;
                  case 'claude-usage': panelData['claude-usage'] = usageData; break;
                  case 'crons': panelData.crons = cronJobs; break;
                  case 'models': panelData.models = agentInfo; break;
                  case 'openclaw-status': panelData['openclaw-status'] = getSystemStatus(); break;
                  case '_test': panelData['_test'] = { message: 'Hello from _test panel!', ts: Date.now() }; break;
                }
              }

              ws.send(JSON.stringify({
                type: 'metrics',
                // Legacy format (backward compat)
                data: metrics,
                usage: usageData,
                agent: agentInfo,
                crons: cronJobs,
                // New contract format
                panels: panelData
              }));
            } catch {}
          };

          sendMetrics();
          interval = setInterval(sendMetrics, 2000);
        } else {
          ws.send(JSON.stringify({ type: 'auth', ok: false }));
          ws.close();
        }
      }
    } catch {
      ws.close();
    }
  });

  ws.on('close', () => {
    if (interval) clearInterval(interval);
  });
  ws.on('error', () => {
    if (interval) clearInterval(interval);
  });

  setTimeout(() => {
    if (!authenticated) ws.close();
  }, 10000);
});

// Fire server.ready hook
hooks.action('core.server.ready', server, config);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[Server] ${config.name || 'OpenClaw Dashboard'} v${updater.getVersionInfo().version} running on http://0.0.0.0:${PORT}\n`);
});
