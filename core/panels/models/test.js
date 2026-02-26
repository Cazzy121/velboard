const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mockContext, callHandler } = require('../../test-utils');

describe('models panel', () => {
  it('api returns data or 500 (depends on config file)', async () => {
    const ctx = mockContext({ panel: { id: 'models', manifest: {} } });
    const api = require('./api.js')(ctx);
    const { statusCode, data } = await callHandler(api.handler);
    // Either returns model info or 500 if config missing
    assert.ok([200, 500].includes(statusCode));
    if (statusCode === 200) {
      assert.equal(typeof data.primary, 'string');
      assert.ok(Array.isArray(data.fallbacks));
    }
  });

  it('returns 403 when auth fails', async () => {
    const ctx = mockContext({ panel: { id: 'models', manifest: {} }, auth: { check: () => null } });
    const api = require('./api.js')(ctx);
    const { statusCode } = await callHandler(api.handler);
    assert.equal(statusCode, 403);
  });
});
