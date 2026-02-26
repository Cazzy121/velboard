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
    assert.ok(Number.isInteger(data.cores));
  });

  it('hooks filter is applied', async () => {
    const ctx = mockContext({
      panel: { id: 'cpu', manifest: {} },
      hooks: { filter: async (name, data) => ({ ...data, extra: true }) },
    });
    const api = require('./api.js')(ctx);
    const { data } = await callHandler(api.handler);
    assert.equal(data.extra, true);
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
