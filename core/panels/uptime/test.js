const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mockContext, callHandler } = require('../../test-utils');

describe('uptime panel', () => {
  it('api returns valid data shape', async () => {
    const ctx = mockContext({ panel: { id: 'uptime', manifest: {} } });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.equal(typeof data.uptime, 'number');
    assert.equal(typeof data.hostname, 'string');
  });

  it('returns 403 when auth fails', async () => {
    const ctx = mockContext({ panel: { id: 'uptime', manifest: {} }, auth: { check: () => null } });
    const api = require('./api.js')(ctx);
    const { statusCode } = await callHandler(api.handler);
    assert.equal(statusCode, 403);
  });
});
