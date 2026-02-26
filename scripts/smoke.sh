#!/bin/bash
# Layer 2: Integration smoke test
# Starts server in TEST_MODE, checks all endpoints, kills server

set -e
PORT=3799
export TEST_MODE=true
export BOT_TOKEN=test-token-smoke

# Ensure config.json exists, set smoke port
RESTORE_CONFIG=false
if [ -f config.json ]; then
  cp config.json config.json.bak
  RESTORE_CONFIG=true
fi
node -e "
const fs = require('fs');
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync('config.json','utf8')); } catch {
  try { cfg = JSON.parse(fs.readFileSync('config.example.json','utf8')); } catch {}
}
cfg.port = $PORT;
fs.writeFileSync('config.json', JSON.stringify(cfg));
"

# Start server in background
node core/server.js &
SERVER_PID=$!

cleanup() {
  kill $SERVER_PID 2>/dev/null || true
  if [ "$RESTORE_CONFIG" = true ] && [ -f config.json.bak ]; then
    mv config.json.bak config.json
  fi
}
trap cleanup EXIT

sleep 3

# Health check
curl -sf http://localhost:$PORT/api/health > /dev/null || { echo "FAIL: health"; exit 1; }

# Config
curl -sf http://localhost:$PORT/api/config > /dev/null || { echo "FAIL: config"; exit 1; }

# Panel list
PANELS=$(curl -sf http://localhost:$PORT/api/panels)
echo "$PANELS" | node -e "const p=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!p.length) process.exit(1)" || { echo "FAIL: no panels"; exit 1; }

# Each panel API — 403 = auth broken (hard fail), 500 = ok for panels needing external state
echo "$PANELS" | node -e "
const panels = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const http = require('http');
const allowFail = new Set(['models', 'openclaw-status']);
let failed = false;
let done = 0;
for (const p of panels) {
  http.get('http://localhost:$PORT/api/panels/' + p.id, (res) => {
    if (res.statusCode === 403) {
      console.log('FAIL: /api/panels/' + p.id + ' → 403 (auth broken)');
      failed = true;
    } else if (res.statusCode !== 200 && !allowFail.has(p.id)) {
      console.log('FAIL: /api/panels/' + p.id + ' → ' + res.statusCode);
      failed = true;
    } else {
      console.log('OK: /api/panels/' + p.id + (res.statusCode !== 200 ? ' (' + res.statusCode + ' expected)' : ''));
    }
    done++;
    if (done === panels.length) process.exit(failed ? 1 : 0);
  });
}
" || { echo "FAIL: panel APIs"; exit 1; }

# Version
curl -sf http://localhost:$PORT/api/version > /dev/null || { echo "FAIL: version"; exit 1; }

# Restore original config
if [ "$RESTORE_CONFIG" = true ]; then
  mv config.json.bak config.json
else
  rm -f config.json
fi

echo "All smoke tests passed!"
