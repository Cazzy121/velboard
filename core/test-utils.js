const http = require('http');

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key] && typeof target[key] === 'object') {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function mockContext(overrides = {}) {
  const defaults = {
    hooks: {
      filter: async (name, data) => data,
      action: async () => {},
    },
    config: {},
    auth: {
      check: () => ({ id: 1, first_name: 'Test' }),
    },
    panel: {
      id: 'test',
      manifest: {},
    },
    deps: {
      exec: async () => '',
      readFile: async () => '',
      fetch: async () => new Response('{}'),
    },
  };
  return deepMerge(defaults, overrides);
}

function mockReqRes() {
  return new Promise((resolve) => {
    const req = { body: {}, query: {}, params: {}, headers: {}, ip: '127.0.0.1' };
    let statusCode = 200;
    const res = {
      status(code) { statusCode = code; return res; },
      json(data) { resolve({ statusCode, data }); },
      send(data) { resolve({ statusCode, data }); },
      setHeader() {},
    };
    resolve.__req = req;
    resolve.__res = res;
    // Return { req, res, result } where result is the promise
  });
}

function callHandler(handler) {
  return new Promise((resolve, reject) => {
    const req = { body: {}, query: {}, params: {}, headers: {}, ip: '127.0.0.1' };
    let statusCode = 200;
    const res = {
      status(code) { statusCode = code; return res; },
      json(data) { resolve({ statusCode, data }); },
      send(data) { resolve({ statusCode, data }); },
      setHeader() {},
    };
    handler(req, res).catch(reject);
  });
}

function createTestApp() {
  const express = require('express');
  const app = express();
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      resolve({
        app,
        url: `http://localhost:${port}`,
        close: () => server.close(),
      });
    });
  });
}

module.exports = { createTestApp, mockContext, callHandler };
