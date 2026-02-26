const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mockContext, callHandler } = require('../../test-utils');

const MOCK_USAGE = JSON.stringify({
  five_hour: { used: 50, limit: 100 },
  seven_day: { used: 200, limit: 500 },
  seven_day_opus: { used: 100, limit: 250 },
  seven_day_sonnet: { used: 100, limit: 250 },
  fetched_at: '2026-01-01T00:00:00Z',
});

describe('claude-usage panel', () => {
  it('api returns valid data shape', async () => {
    const ctx = mockContext({
      panel: { id: 'claude-usage', manifest: {} },
      deps: { readFile: async () => MOCK_USAGE },
    });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.equal(typeof data.five_hour, 'object');
    assert.equal(data.fetched_at, '2026-01-01T00:00:00Z');
  });

  it('returns null when file not found', async () => {
    const ctx = mockContext({
      panel: { id: 'claude-usage', manifest: {} },
      deps: { readFile: async () => { throw new Error('ENOENT'); } },
    });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.equal(data, null);
  });

  it('returns 403 when auth fails', async () => {
    const ctx = mockContext({ panel: { id: 'claude-usage', manifest: {} }, auth: { check: () => null } });
    const api = require('./api.js')(ctx);
    const { statusCode } = await callHandler(api.handler);
    assert.equal(statusCode, 403);
  });
});
