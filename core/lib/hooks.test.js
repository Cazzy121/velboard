const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('HookSystem', () => {
  let hooks;

  beforeEach(() => {
    // Fresh instance each test
    const HookSystem = require('./hooks').constructor;
    hooks = new HookSystem();
  });

  describe('filter()', () => {
    it('returns original value when no handlers', async () => {
      const result = await hooks.filter('test.hook.name', 42);
      assert.equal(result, 42);
    });

    it('passes value through filter chain', async () => {
      hooks.register('test.filter.chain', (val) => val + 1);
      hooks.register('test.filter.chain', (val) => val * 2);
      const result = await hooks.filter('test.filter.chain', 5);
      assert.equal(result, 12); // (5+1)*2
    });

    it('skips undefined returns', async () => {
      hooks.register('test.filter.undef', () => undefined);
      const result = await hooks.filter('test.filter.undef', 'original');
      assert.equal(result, 'original');
    });

    it('keeps null returns', async () => {
      hooks.register('test.filter.null', () => null);
      const result = await hooks.filter('test.filter.null', 'original');
      assert.equal(result, null);
    });

    it('respects priority ordering', async () => {
      const order = [];
      hooks.register('test.filter.prio', () => { order.push('b'); }, 20);
      hooks.register('test.filter.prio', () => { order.push('a'); }, 5);
      await hooks.filter('test.filter.prio', null);
      assert.deepEqual(order, ['a', 'b']);
    });

    it('handles async handlers', async () => {
      hooks.register('test.filter.async', async (val) => {
        await new Promise(r => setTimeout(r, 10));
        return val + ' async';
      });
      const result = await hooks.filter('test.filter.async', 'hello');
      assert.equal(result, 'hello async');
    });

    it('continues on error', async () => {
      hooks.register('test.filter.err', () => { throw new Error('boom'); });
      hooks.register('test.filter.err', (val) => val + 1);
      const result = await hooks.filter('test.filter.err', 5);
      assert.equal(result, 6);
    });
  });

  describe('action()', () => {
    it('calls all handlers', async () => {
      let called = 0;
      hooks.register('test.action.call', () => { called++; });
      hooks.register('test.action.call', () => { called++; });
      await hooks.action('test.action.call');
      assert.equal(called, 2);
    });

    it('does nothing with no handlers', async () => {
      await hooks.action('test.action.noop'); // should not throw
    });
  });

  describe('list()', () => {
    it('returns registered hook names', () => {
      hooks.register('a.b.c', () => {});
      hooks.register('d.e.f', () => {});
      const { hooks: names } = hooks.list();
      assert.ok(names.includes('a.b.c'));
      assert.ok(names.includes('d.e.f'));
    });
  });
});
