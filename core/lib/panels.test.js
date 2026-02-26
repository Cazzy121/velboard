const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildPanelList, makeCls } = require('./panels');

describe('makeCls()', () => {
  it('generates scoped class name', () => {
    const cls = makeCls('cpu');
    assert.equal(cls('value'), 'p-cpu-value');
    assert.equal(cls('bar'), 'p-cpu-bar');
  });
});

describe('buildPanelList()', () => {
  const makeRegistry = (panels) => {
    const map = new Map();
    for (const p of panels) {
      map.set(p.id, { manifest: p, source: 'core' });
    }
    return map;
  };

  it('returns panels sorted by position', () => {
    const reg = makeRegistry([
      { id: 'b', position: 2, name: 'B', size: 'half' },
      { id: 'a', position: 1, name: 'A', size: 'half' },
    ]);
    const list = buildPanelList(reg, {});
    assert.equal(list[0].id, 'a');
    assert.equal(list[1].id, 'b');
  });

  it('filters disabled panels', () => {
    const reg = makeRegistry([
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ]);
    const list = buildPanelList(reg, { panels: { disabled: ['b'] } });
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'a');
  });

  it('respects config order override', () => {
    const reg = makeRegistry([
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
    ]);
    const list = buildPanelList(reg, { panels: { order: ['c', 'a', 'b'] } });
    assert.equal(list[0].id, 'c');
    assert.equal(list[1].id, 'a');
    assert.equal(list[2].id, 'b');
  });

  it('hides _prefixed panels when not TEST_MODE', () => {
    const orig = process.env.TEST_MODE;
    delete process.env.TEST_MODE;
    const reg = makeRegistry([
      { id: '_test', position: 1 },
      { id: 'cpu', position: 2 },
    ]);
    const list = buildPanelList(reg, {});
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'cpu');
    if (orig !== undefined) process.env.TEST_MODE = orig;
  });
});
