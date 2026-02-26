const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const auth = require('./auth');

describe('auth', () => {
  describe('isAllowed()', () => {
    it('returns false for unknown user', () => {
      assert.equal(auth.isAllowed(99999), false);
    });

    it('returns true for allowed user after init', () => {
      auth.init('fake-token', [12345]);
      assert.equal(auth.isAllowed(12345), true);
      assert.equal(auth.isAllowed(99999), false);
    });
  });

  describe('check() in TEST_MODE', () => {
    const origTestMode = process.env.TEST_MODE;

    beforeEach(() => { process.env.TEST_MODE = 'true'; });
    afterEach(() => {
      if (origTestMode !== undefined) process.env.TEST_MODE = origTestMode;
      else delete process.env.TEST_MODE;
    });

    it('returns mock user in TEST_MODE', () => {
      const req = { body: {}, signedCookies: {} };
      const user = auth.check(req);
      assert.ok(user);
      assert.equal(user.id, 0);
      assert.equal(user.first_name, 'Test');
    });
  });

  describe('check() without TEST_MODE', () => {
    const origTestMode = process.env.TEST_MODE;

    beforeEach(() => { delete process.env.TEST_MODE; });
    afterEach(() => {
      if (origTestMode !== undefined) process.env.TEST_MODE = origTestMode;
      else delete process.env.TEST_MODE;
    });

    it('returns null for unauthenticated request', () => {
      const req = { body: {}, signedCookies: {} };
      const user = auth.check(req);
      assert.equal(user, null);
    });
  });
});
