const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mockContext, callHandler } = require('../../test-utils');

const MOCK_STATUS_OUTPUT = `
┌──────────────────┬────────────────────────┐
│ Version          │ 1.2.3                  │
│ OS               │ Debian 12              │
│ Channel          │ telegram               │
│ Gateway service  │ running                │
│ Heartbeat        │ 5m                     │
│ Sessions         │ 2 active               │
│ Agents           │ 1 online               │
│ Memory           │ 512MB                  │
│ Tailscale        │ connected              │
└──────────────────┴────────────────────────┘
Summary: 0 critical, 1 warn, 3 info
`;

describe('openclaw-status panel', () => {
  it('api returns valid data shape with mocked exec', async () => {
    const ctx = mockContext({
      panel: { id: 'openclaw-status', manifest: {} },
      deps: { exec: async () => MOCK_STATUS_OUTPUT },
    });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.equal(data.online, true);
    assert.equal(typeof data.version, 'string');
    assert.equal(typeof data.gateway, 'string');
  });

  it('handles exec failure gracefully', async () => {
    const ctx = mockContext({
      panel: { id: 'openclaw-status', manifest: {} },
      deps: { exec: async () => { throw new Error('not found'); } },
    });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.equal(data.online, false);
  });

  it('returns 403 when auth fails', async () => {
    const ctx = mockContext({ panel: { id: 'openclaw-status', manifest: {} }, auth: { check: () => null } });
    const api = require('./api.js')(ctx);
    const { statusCode } = await callHandler(api.handler);
    assert.equal(statusCode, 403);
  });
});
