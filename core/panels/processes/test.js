const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mockContext, callHandler } = require('../../test-utils');

describe('processes panel', () => {
  it('api returns valid data shape', async () => {
    const ctx = mockContext({ panel: { id: 'processes', manifest: {} } });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.equal(typeof data.total, 'number');
    assert.equal(typeof data.running, 'number');
    assert.equal(typeof data.sleeping, 'number');
    assert.equal(typeof data.os, 'string');
  });

  it('returns 403 when auth fails', async () => {
    const ctx = mockContext({ panel: { id: 'processes', manifest: {} }, auth: { check: () => null } });
    const api = require('./api.js')(ctx);
    const { statusCode } = await callHandler(api.handler);
    assert.equal(statusCode, 403);
  });
});
