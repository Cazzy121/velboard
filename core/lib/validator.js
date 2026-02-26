/**
 * Lightweight JSON Schema validator for panel contracts
 * Supports: type, required, properties, items, minimum, maximum, minLength, maxLength, enum
 * No $ref, no allOf, no fancy stuff.
 */

function validate(data, schema, path = '') {
  const errors = [];

  if (!schema || typeof schema !== 'object') return { valid: true, errors };

  // Type check
  if (schema.type) {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    let valid = false;
    switch (schema.type) {
      case 'string': valid = typeof data === 'string'; break;
      case 'number': valid = typeof data === 'number' && !isNaN(data); break;
      case 'integer': valid = typeof data === 'number' && Number.isInteger(data); break;
      case 'boolean': valid = typeof data === 'boolean'; break;
      case 'object': valid = typeof data === 'object' && data !== null && !Array.isArray(data); break;
      case 'array': valid = Array.isArray(data); break;
      case 'null': valid = data === null; break;
    }
    if (!valid) {
      errors.push({ path: path || '.', message: `Expected ${schema.type}, got ${actualType}`, value: data });
      return { valid: false, errors }; // Stop early on type mismatch
    }
  }

  // Required fields (object)
  if (schema.required && Array.isArray(schema.required) && typeof data === 'object' && data !== null) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push({ path: path ? `${path}.${field}` : field, message: `Required field missing` });
      }
    }
  }

  // Properties (object)
  if (schema.properties && typeof data === 'object' && data !== null) {
    for (const [key, subSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        const sub = validate(data[key], subSchema, path ? `${path}.${key}` : key);
        errors.push(...sub.errors);
      }
    }
  }

  // Items (array)
  if (schema.items && Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const sub = validate(data[i], schema.items, `${path}[${i}]`);
      errors.push(...sub.errors);
    }
  }

  // Enum
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push({ path: path || '.', message: `Must be one of: ${schema.enum.join(', ')}`, value: data });
  }

  // Min/max for numbers
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path: path || '.', message: `Must be >= ${schema.minimum}`, value: data });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path: path || '.', message: `Must be <= ${schema.maximum}`, value: data });
    }
  }

  // MinLength/maxLength for strings
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({ path: path || '.', message: `Min length ${schema.minLength}`, value: data });
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({ path: path || '.', message: `Max length ${schema.maxLength}`, value: data });
    }
  }

  return { valid: errors.length === 0, errors };
}

// Manifest schema per CONTRACTS.md
const MANIFEST_SCHEMA = {
  type: 'object',
  required: ['id', 'contractVersion', 'name', 'description', 'version', 'author', 'position', 'size', 'refreshMs', 'requires', 'capabilities', 'dataSchema'],
  properties: {
    id: { type: 'string' },
    contractVersion: { type: 'string' },
    name: { type: 'string', maxLength: 30 },
    description: { type: 'string', maxLength: 100 },
    version: { type: 'string' },
    author: { type: 'string' },
    position: { type: 'integer' },
    size: { type: 'string', enum: ['half', 'full'] },
    refreshMs: { type: 'integer', minimum: 1000, maximum: 300000 },
    requires: { type: 'array', items: { type: 'string' } },
    capabilities: { type: 'array', items: { type: 'string' } },
    dataSchema: { type: 'object' },
    rateLimit: {
      type: 'object',
      properties: {
        windowMs: { type: 'integer' },
        max: { type: 'integer' }
      }
    },
    config: { type: 'object' }
  }
};

const SUPPORTED_CONTRACT_VERSIONS = ['1.0'];

function validateManifest(manifest) {
  const result = validate(manifest, MANIFEST_SCHEMA);

  // Extra: check contractVersion is supported
  if (manifest.contractVersion && !SUPPORTED_CONTRACT_VERSIONS.includes(manifest.contractVersion)) {
    result.errors.push({ path: 'contractVersion', message: `Unsupported contract version: ${manifest.contractVersion}` });
    result.valid = false;
  }

  // Extra: id must match folder convention (lowercase-hyphenated or _prefixed)
  if (manifest.id && !/^[_a-z][a-z0-9-]*$/.test(manifest.id)) {
    result.errors.push({ path: 'id', message: `ID must be lowercase-hyphenated (got: ${manifest.id})` });
    result.valid = false;
  }

  return result;
}

function validateData(data, schema) {
  return validate(data, schema);
}

module.exports = { validate, validateManifest, validateData, MANIFEST_SCHEMA };
