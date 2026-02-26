/**
 * Data-gathering functions extracted from server.js
 * Used by WebSocket broadcast; legacy HTTP routes removed.
 */

const fs = require('fs');
const path = require('path');
const si = require('systeminformation');
const { execFileSync } = require('child_process');

// WORKSPACE = parent of the dashboard root (where claude-usage.json lives)
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const WORKSPACE = path.resolve(ROOT_DIR, '..');

async function getSystemMetrics() {
  const [cpu, mem, disk, time, osInfo, proc] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.time(),
    si.osInfo(),
    si.processes()
  ]);
  const rootDisk = disk.find(d => d.mount === '/') || disk[0] || {};
  return {
    cpu: { load: Math.round(cpu.currentLoad * 10) / 10, cores: cpu.cpus?.length || 0 },
    memory: {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      pct: Math.round((mem.used / mem.total) * 1000) / 10
    },
    disk: {
      total: rootDisk.size || 0,
      used: rootDisk.used || 0,
      free: (rootDisk.size || 0) - (rootDisk.used || 0),
      pct: Math.round((rootDisk.use || 0) * 10) / 10,
      mount: rootDisk.mount || '/'
    },
    uptime: time.uptime,
    os: `${osInfo.distro} ${osInfo.release}`,
    hostname: osInfo.hostname,
    processes: { total: proc.all, running: proc.running, sleeping: proc.sleeping },
    ts: Date.now()
  };
}

function getUsageData() {
  try {
    const data = fs.readFileSync(path.join(WORKSPACE, 'claude-usage.json'), 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function getSystemStatus() {
  try {
    const raw = execFileSync('openclaw', ['status'], {
      timeout: 5000,
      encoding: 'utf8',
      shell: false
    }).trim();

    const get = (label) => {
      const re = new RegExp(`│\\s*${label}\\s*│\\s*(.+?)\\s*│`, 'i');
      const m = raw.match(re);
      return m ? m[1].trim() : null;
    };

    const version = get('Updated') || get('Version');
    const heartbeat = get('Heartbeat');
    const sessions = get('Sessions');
    const memory = get('Memory');

    const chanMatch = raw.match(/│\s*(telegram|discord|whatsapp|signal)\s*│\s*(ON|OFF)\s*│/i);
    const channel = chanMatch ? { name: chanMatch[1], status: chanMatch[2] } : null;

    const secMatch = raw.match(/Summary:\s*(\d+)\s*critical[,·]\s*(\d+)\s*warn[,·]\s*(\d+)\s*info/i);
    const security = secMatch
      ? { critical: parseInt(secMatch[1]), warn: parseInt(secMatch[2]), info: parseInt(secMatch[3]) }
      : null;

    return {
      online: true,
      version: version || 'unknown',
      channel: channel || { name: 'unknown', status: 'ON' },
      heartbeat: heartbeat || 'unknown',
      sessions: sessions || 'unknown',
      memory: memory || 'unknown',
      security,
    };
  } catch {
    return { online: false, error: 'CLI not found or failed' };
  }
}

function getAgentInfo() {
  try {
    const cfgPath = path.join(WORKSPACE, '..', 'openclaw.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const agent = cfg.agents?.defaults || {};
    const model = agent.model || {};
    return {
      primary: model.primary || 'unknown',
      fallbacks: model.fallbacks || [],
      subagent: agent.subagents?.model || null,
      heartbeat: agent.heartbeat?.model || null,
      heartbeatInterval: agent.heartbeat?.every || null,
      context: '200k',
      channel: cfg.channels?.telegram?.enabled ? 'Telegram' : 'unknown',
      streamMode: cfg.channels?.telegram?.streamMode || 'off',
      name: cfg.ui?.assistant?.name || 'Agent'
    };
  } catch {
    return null;
  }
}

function getCronJobs() {
  try {
    const cronPaths = [
      path.join(WORKSPACE, '..', 'cron', 'jobs.json'),
      path.join(WORKSPACE, '..', 'agents', 'main', 'cron-jobs.json')
    ];
    for (const p of cronPaths) {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const jobs = Array.isArray(data) ? data : (data.jobs || []);
        return jobs.map(j => ({
          id: j.id,
          name: j.name || 'Unnamed',
          enabled: j.enabled !== false,
          schedule: j.schedule || null,
          sessionTarget: j.sessionTarget || null,
          model: j.payload?.model || null,
          payloadKind: j.payload?.kind || null,
          lastStatus: j.state?.lastStatus || null,
          lastRunAt: j.state?.lastRunAtMs ? new Date(j.state.lastRunAtMs).toISOString() : null,
          lastDurationMs: j.state?.lastDurationMs || null,
          nextRunAt: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toISOString() : null,
          consecutiveErrors: j.state?.consecutiveErrors || 0,
          lastError: j.state?.lastError || null
        }));
      }
    }
    return [];
  } catch {
    return [];
  }
}

module.exports = { getSystemMetrics, getUsageData, getSystemStatus, getAgentInfo, getCronJobs };
