const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mockContext, callHandler } = require('../../test-utils');

describe('crons panel', () => {
  it('api returns array (may be empty)', async () => {
    const ctx = mockContext({ panel: { id: 'crons', manifest: {} } });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    assert.equal(statusCode, 200);
    assert.ok(Array.isArray(data));
  });

  it('returns 403 when auth fails', async () => {
    const ctx = mockContext({ panel: { id: 'crons', manifest: {} }, auth: { check: () => null } });
    const api = require('./api.js')(ctx);
    const { statusCode } = await callHandler(api.handler);
    assert.equal(statusCode, 403);
  });
});
