const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validate, validateManifest } = require('./validator');

describe('validate()', () => {
  it('validates string type', () => {
    assert.ok(validate('hello', { type: 'string' }).valid);
    assert.ok(!validate(123, { type: 'string' }).valid);
  });

  it('validates number type', () => {
    assert.ok(validate(42, { type: 'number' }).valid);
    assert.ok(!validate('42', { type: 'number' }).valid);
  });

  it('validates integer type', () => {
    assert.ok(validate(5, { type: 'integer' }).valid);
    assert.ok(!validate(5.5, { type: 'integer' }).valid);
  });

  it('validates object with required fields', () => {
    const schema = { type: 'object', required: ['a'], properties: { a: { type: 'string' } } };
    assert.ok(validate({ a: 'hi' }, schema).valid);
    assert.ok(!validate({}, schema).valid);
  });

  it('validates array items', () => {
    const schema = { type: 'array', items: { type: 'number' } };
    assert.ok(validate([1, 2], schema).valid);
    assert.ok(!validate([1, 'x'], schema).valid);
  });

  it('validates enum', () => {
    assert.ok(validate('a', { enum: ['a', 'b'] }).valid);
    assert.ok(!validate('c', { enum: ['a', 'b'] }).valid);
  });

  it('validates min/max for numbers', () => {
    assert.ok(validate(5, { type: 'number', minimum: 1, maximum: 10 }).valid);
    assert.ok(!validate(0, { type: 'number', minimum: 1 }).valid);
  });

  it('validates minLength/maxLength for strings', () => {
    assert.ok(validate('abc', { type: 'string', minLength: 1, maxLength: 5 }).valid);
    assert.ok(!validate('', { type: 'string', minLength: 1 }).valid);
  });

  it('returns valid for empty schema', () => {
    assert.ok(validate('anything', {}).valid);
  });
});

describe('validateManifest()', () => {
  const validManifest = {
    id: 'test-panel',
    contractVersion: '1.0',
    name: 'Test',
    description: 'A test panel',
    version: '1.0.0',
    author: 'tester',
    position: 1,
    size: 'half',
    refreshMs: 5000,
    requires: [],
    capabilities: [],
    dataSchema: { type: 'object' },
  };

  it('accepts valid manifest', () => {
    assert.ok(validateManifest(validManifest).valid);
  });

  it('rejects missing required fields', () => {
    const { id, ...noId } = validManifest;
    assert.ok(!validateManifest(noId).valid);
  });

  it('rejects unsupported contract version', () => {
    assert.ok(!validateManifest({ ...validManifest, contractVersion: '99.0' }).valid);
  });

  it('rejects invalid id format', () => {
    assert.ok(!validateManifest({ ...validManifest, id: 'Bad Name!' }).valid);
  });

  it('allows _prefixed ids', () => {
    assert.ok(validateManifest({ ...validManifest, id: '_test' }).valid);
  });
});
