// Panel discovery, loading, registration — Contract v1.0
//
// Resolution order (last wins):
// 1. core/panels/
// 2. custom/panels/
// 3. plugins/*/panels/
// 4. custom/overrides/

const fs = require('fs');
const path = require('path');
const hooks = require('./hooks');
const { validateManifest, validateData } = require('./validator');

/**
 * Scan directory for panel folders
 */
function scanPanelDir(dir) {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch (err) {
    console.error(`[Panels] Error scanning ${dir}:`, err.message);
    return [];
  }
}

/**
 * Load and validate manifest.json
 */
function loadManifest(panelPath, panelId) {
  const manifestPath = path.join(panelPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return { manifest: null, errors: ['manifest.json not found'] };
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const result = validateManifest(manifest);
    
    // Check id matches folder name
    if (manifest.id && manifest.id !== panelId) {
      result.errors.push({ path: 'id', message: `ID "${manifest.id}" doesn't match folder "${panelId}"` });
      result.valid = false;
    }

    // Check required files exist
    if (!fs.existsSync(path.join(panelPath, 'api.js'))) {
      result.errors.push({ path: 'api.js', message: 'api.js not found' });
      result.valid = false;
    }
    if (!fs.existsSync(path.join(panelPath, 'ui.js'))) {
      result.errors.push({ path: 'ui.js', message: 'ui.js not found' });
      result.valid = false;
    }

    return { manifest, errors: result.errors, valid: result.valid };
  } catch (err) {
    return { manifest: null, errors: [`Failed to parse manifest: ${err.message}`] };
  }
}

/**
 * Generate scoped CSS class helper
 */
function makeCls(panelId) {
  return (name) => `p-${panelId}-${name}`;
}

/**
 * Load panel api.js with context injection
 */
function loadPanelAPI(panelPath, context) {
  const apiPath = path.join(panelPath, 'api.js');
  if (!fs.existsSync(apiPath)) return null;
  try {
    // Clear require cache so reloads work
    delete require.cache[require.resolve(apiPath)];
    const apiModule = require(apiPath);
    if (typeof apiModule === 'function') {
      return apiModule(context);
    }
    return apiModule;
  } catch (err) {
    console.error(`[Panels] Error loading API for ${panelPath}:`, err.message);
    return null;
  }
}

/**
 * Discover all panels across all sources
 */
function discoverPanels(rootDir) {
  const registry = new Map();
  const report = { loaded: [], failed: [], skipped: [] };

  const sources = [
    { dir: path.join(rootDir, 'core', 'panels'), source: 'core' },
    { dir: path.join(rootDir, 'custom', 'panels'), source: 'custom' },
  ];

  // Plugin panels
  const pluginsDir = path.join(rootDir, 'plugins');
  if (fs.existsSync(pluginsDir)) {
    const plugins = scanPanelDir(pluginsDir);
    for (const pluginName of plugins) {
      sources.push({
        dir: path.join(pluginsDir, pluginName, 'panels'),
        source: `plugin:${pluginName}`
      });
    }
  }

  // Overrides (highest priority)
  sources.push({ dir: path.join(rootDir, 'custom', 'overrides'), source: 'override' });

  for (const { dir, source } of sources) {
    const panelIds = scanPanelDir(dir);
    for (const panelId of panelIds) {
      const panelPath = path.join(dir, panelId);
      const { manifest, errors, valid } = loadManifest(panelPath, panelId);

      if (!manifest) {
        report.failed.push({ id: panelId, source, errors });
        continue;
      }

      if (valid === false) {
        // For new contract panels, strict validation
        // For legacy panels (no contractVersion), be lenient
        if (manifest.contractVersion) {
          report.failed.push({ id: panelId, source, errors });
          continue;
        }
        // Legacy panel — load with warnings
        report.skipped.push({ id: panelId, source, errors, reason: 'legacy (no contractVersion)' });
      }

      registry.set(panelId, { manifest, path: panelPath, source });
      report.loaded.push({ id: panelId, source, version: manifest.version || '?' });
    }
  }

  // Fire discovery hook
  hooks.action('core.panels.discovered', registry);

  return { registry, report };
}

/**
 * Register panel API endpoints with Express
 */
function registerPanelAPIs(app, registry, context, rateLimit) {
  let registered = 0;

  for (const [panelId, panelInfo] of registry.entries()) {
    const manifest = panelInfo.manifest;
    const panelContext = {
      ...context,
      panel: {
        id: panelId,
        manifest,
        cls: makeCls(panelId),
        config: context.config?.panels?.[panelId] || manifest.config || {}
      }
    };

    const api = loadPanelAPI(panelInfo.path, panelContext);
    if (!api || !api.handler) continue;

    const endpoint = api.endpoint || `/api/panels/${panelId}`;

    // Per-panel rate limiting
    const middlewares = [];
    if (rateLimit && manifest.rateLimit) {
      middlewares.push(rateLimit({
        windowMs: manifest.rateLimit.windowMs || 60000,
        max: manifest.rateLimit.max || 30,
        keyGenerator: (req) => `panel:${panelId}:${req.ip}`
      }));
    }

    // Wrap in error boundary
    app.all(endpoint, ...middlewares, async (req, res, next) => {
      try {
        await api.handler(req, res, next);
      } catch (err) {
        console.error(`[Panel API Error] ${panelId}:`, err.message);
        res.status(500).json({ error: 'Panel API error', code: 'PANEL_ERROR', retry: true });
      }
    });

    registered++;
    console.log(`  ✓ ${endpoint} (${panelInfo.source}/${panelId})`);
  }

  return registered;
}

/**
 * Build ordered panel manifest list for frontend
 */
function buildPanelList(registry, config) {
  let panels = Array.from(registry.values()).map(p => ({
    ...p.manifest,
    _source: p.source
  }));

  // Filter disabled
  const disabled = new Set(config.panels?.disabled || []);
  panels = panels.filter(p => !disabled.has(p.id));

  // Hide _prefixed panels unless TEST_MODE
  if (process.env.TEST_MODE !== 'true') {
    panels = panels.filter(p => !p.id.startsWith('_'));
  }

  // Sort by position, then alphabetical. Config order overrides all.
  const orderMap = new Map();
  (config.panels?.order || []).forEach((id, idx) => orderMap.set(id, idx));

  panels.sort((a, b) => {
    // Config order wins
    const oa = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
    const ob = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
    if (oa !== ob) return oa - ob;

    // Then position
    const pa = a.position !== undefined ? a.position : 999;
    const pb = b.position !== undefined ? b.position : 999;
    if (pa !== pb) return pa - pb;

    // Then alphabetical
    return a.id.localeCompare(b.id);
  });

  return panels;
}

/**
 * Test data schema validation (TEST_MODE only)
 */
async function validateDataSchemas(registry, context) {
  if (process.env.TEST_MODE !== 'true') return [];
  const results = [];

  for (const [panelId, panelInfo] of registry.entries()) {
    const manifest = panelInfo.manifest;
    if (!manifest.dataSchema || !manifest.contractVersion) continue;

    try {
      const panelContext = {
        ...context,
        panel: { id: panelId, manifest, cls: makeCls(panelId), config: {} }
      };
      const api = loadPanelAPI(panelInfo.path, panelContext);
      if (!api || !api.handler) continue;

      // Mock request/response
      const mockData = await new Promise((resolve) => {
        const mockReq = { body: {}, query: {}, params: {}, headers: {}, ip: '127.0.0.1' };
        const mockRes = {
          json: (data) => resolve(data),
          status: () => mockRes,
          send: () => resolve(null),
          setHeader: () => {},
        };
        api.handler(mockReq, mockRes).catch(() => resolve(null));
      });

      if (mockData) {
        const result = validateData(mockData, manifest.dataSchema);
        results.push({ panelId, valid: result.valid, errors: result.errors });
      }
    } catch (err) {
      results.push({ panelId, valid: false, errors: [{ message: err.message }] });
    }
  }

  return results;
}

module.exports = {
  discoverPanels,
  registerPanelAPIs,
  buildPanelList,
  validateDataSchemas,
  makeCls
};
