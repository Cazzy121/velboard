import { html, useState, useEffect, useRef, useCallback } from '/core/vendor/preact-htm.js';

const STATES = { DISCONNECTED: 0, CONNECTING: 1, CONNECTED: 2, AGENT_ACTIVE: 3 };

const STATUS_COLORS = {
  [STATES.DISCONNECTED]: '#666',
  [STATES.CONNECTING]: '#f0ad4e',
  [STATES.CONNECTED]: '#5cb85c',
  [STATES.AGENT_ACTIVE]: '#0af',
};

const STATUS_LABELS = {
  [STATES.DISCONNECTED]: 'Not Connected',
  [STATES.CONNECTING]: 'Connecting...',
  [STATES.CONNECTED]: 'Connected',
  [STATES.AGENT_ACTIVE]: 'Agent Active',
};

function detectPlatform() {
  const ua = navigator.userAgent || '';
  const pl = navigator.platform || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return null;
  if (/Win/i.test(pl)) return 'windows';
  if (/Mac/i.test(pl)) return 'mac';
  if (/Linux/i.test(pl)) return 'linux';
  return null;
}

const PLATFORM_LABELS = { linux: 'Linux', mac: 'Mac', windows: 'Windows' };
const ALL_PLATFORMS = ['linux', 'mac', 'windows'];

function DownloadSection({ styles }) {
  const [showOther, setShowOther] = useState(false);
  const platform = detectPlatform();
  const others = ALL_PLATFORMS.filter(p => p !== platform);

  const linkStyle = { color: '#0af', fontSize: '11px', cursor: 'pointer', textDecoration: 'none', opacity: 0.8 };

  if (!platform) {
    return html`
      <div style=${{ marginTop: '12px' }}>
        <div style=${{ color: '#999', fontSize: '12px', marginBottom: '6px' }}>
          ⚠ Unsupported platform — requires a desktop browser (Windows, Mac, or Linux)
        </div>
        <div style=${{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          ${ALL_PLATFORMS.map(p => html`
            <a href=${'/relay/download?platform=' + p} style=${linkStyle}>⬇ ${PLATFORM_LABELS[p]}</a>
          `)}
        </div>
      </div>
    `;
  }

  return html`
    <div style=${{ marginTop: '12px' }}>
      <button style=${styles.btnPrimary} onclick=${() => window.open('/relay/download?platform=' + platform, '_blank')}>
        ⬇ Download for ${PLATFORM_LABELS[platform]}
      </button>
      <div style=${{ marginTop: '6px' }}>
        <span style=${{ ...linkStyle, opacity: 0.5 }} onclick=${() => setShowOther(!showOther)}>
          ${showOther ? '▾' : '▸'} Other platforms
        </span>
        ${showOther && html`
          <div style=${{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            ${others.map(p => html`
              <a href=${'/relay/download?platform=' + p} style=${linkStyle}>⬇ ${PLATFORM_LABELS[p]}</a>
            `)}
            <a href=${'/relay/download'} style=${{ ...linkStyle, opacity: 0.5 }}>📦 All (ZIP)</a>
          </div>
        `}
      </div>
    </div>
  `;
}

export default function BrowserRelayPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  const [state, setState] = useState(STATES.DISCONNECTED);
  const [tabCount, setTabCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const [latency, setLatency] = useState(null);
  const [connectedSince, setConnectedSince] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [errMsg, setErrMsg] = useState(null);

  const relayWS = useRef(null);
  const localWSMap = useRef({});
  const pingTimer = useRef(null);
  const pingStart = useRef(null);
  const detectTimer = useRef(null);
  const token = useRef(null);

  const cleanup = useCallback(() => {
    if (relayWS.current) { try { relayWS.current.close(); } catch(e){} relayWS.current = null; }
    Object.values(localWSMap.current).forEach(ws => { try { ws.close(); } catch(e){} });
    localWSMap.current = {};
    if (pingTimer.current) clearInterval(pingTimer.current);
    if (detectTimer.current) clearInterval(detectTimer.current);
    setState(STATES.DISCONNECTED);
    setTabCount(0);
    setMsgCount(0);
    setLatency(null);
    setConnectedSince(null);
    setActiveTab(null);
  }, []);

  // Send targets to relay (filtering out dashboard)
  const sendTargets = useCallback((targets) => {
    const filtered = targets.filter(t =>
      t.type === 'page' &&
      !t.url.includes('/dashboard') &&
      !t.url.startsWith('chrome://') &&
      !t.url.startsWith('chrome-extension://')
    );
    setTabCount(filtered.length);
    if (relayWS.current && relayWS.current.readyState === 1) {
      relayWS.current.send(JSON.stringify({ type: 'targets', data: filtered }));
    }
  }, []);

  // Connect a local CDP websocket for a target
  const connectLocalTarget = useCallback((target) => {
    if (localWSMap.current[target.id]) return;
    const wsUrl = target.webSocketDebuggerUrl;
    if (!wsUrl) return;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {};
      ws.onmessage = (e) => {
        setMsgCount(c => c + 1);
        if (relayWS.current && relayWS.current.readyState === 1) {
          relayWS.current.send(JSON.stringify({ type: 'cdp', targetId: target.id, data: JSON.parse(e.data) }));
        }
      };
      ws.onclose = () => { delete localWSMap.current[target.id]; };
      ws.onerror = () => { delete localWSMap.current[target.id]; };
      localWSMap.current[target.id] = ws;
    } catch(e) {}
  }, []);

  const disconnectLocalTarget = useCallback((targetId) => {
    const ws = localWSMap.current[targetId];
    if (ws) { try { ws.close(); } catch(e){} delete localWSMap.current[targetId]; }
  }, []);

  // Poll for targets and update connections
  const refreshTargets = useCallback(async () => {
    try {
      const resp = await fetch('http://localhost:9222/json');
      if (!resp.ok) return null;
      const targets = await resp.json();
      sendTargets(targets);

      // Connect to page targets (not dashboard)
      const pageTargets = targets.filter(t =>
        t.type === 'page' &&
        !t.url.includes('/dashboard') &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://')
      );
      pageTargets.forEach(t => connectLocalTarget(t));

      // Disconnect removed targets
      const ids = new Set(pageTargets.map(t => t.id));
      Object.keys(localWSMap.current).forEach(id => {
        if (!ids.has(id)) disconnectLocalTarget(id);
      });

      return targets;
    } catch(e) {
      return null;
    }
  }, [sendTargets, connectLocalTarget, disconnectLocalTarget]);

  const startRelay = useCallback(async () => {
    setState(STATES.CONNECTING);
    setErrMsg(null);
    try {
      // Get token
      const tokenResp = await fetch('/relay/token');
      if (!tokenResp.ok) { setErrMsg('Auth failed'); setState(STATES.DISCONNECTED); return; }
      const { token: t } = await tokenResp.json();
      token.current = t;

      // Check local CDP
      const targets = await refreshTargets();
      if (!targets) {
        setErrMsg('No local browser detected');
        setState(STATES.DISCONNECTED);
        return;
      }

      // Connect to relay
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${location.host}/relay/ws?token=${t}`);

      ws.onopen = () => {
        setState(STATES.CONNECTED);
        setConnectedSince(new Date());
        // Start target polling
        detectTimer.current = setInterval(refreshTargets, 5000);
        // Start ping
        pingTimer.current = setInterval(() => {
          if (ws.readyState === 1) {
            pingStart.current = Date.now();
            ws.send(JSON.stringify({ type: 'pong' })); // we send pong as heartbeat
          }
        }, 30000);
      };

      ws.onmessage = (e) => {
        const env = JSON.parse(e.data);
        switch (env.type) {
          case 'cdp': {
            setMsgCount(c => c + 1);
            const localWS = localWSMap.current[env.targetId];
            if (localWS && localWS.readyState === 1) {
              localWS.send(JSON.stringify(env.data));
            }
            break;
          }
          case 'connect': {
            setState(STATES.AGENT_ACTIVE);
            // Connect to target if not already
            fetch('http://localhost:9222/json').then(r => r.json()).then(targets => {
              const t = targets.find(x => x.id === env.targetId);
              if (t) { connectLocalTarget(t); setActiveTab(t.title); }
            }).catch(() => {});
            break;
          }
          case 'disconnect': {
            disconnectLocalTarget(env.targetId);
            break;
          }
          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            if (pingStart.current) {
              setLatency(Date.now() - pingStart.current);
              pingStart.current = null;
            }
            break;
          }
          case 'agent_disconnected': {
            setState(STATES.CONNECTED);
            setActiveTab(null);
            break;
          }
        }
      };

      ws.onclose = () => {
        cleanup();
      };
      ws.onerror = () => {
        cleanup();
        setErrMsg('Relay connection failed');
      };

      relayWS.current = ws;
    } catch(e) {
      setState(STATES.DISCONNECTED);
      setErrMsg(e.message);
    }
  }, [refreshTargets, connectLocalTarget, disconnectLocalTarget, cleanup]);

  // Auto-detect on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('http://localhost:9222/json');
        if (resp.ok && !cancelled) {
          startRelay();
        }
      } catch(e) {}
    })();
    return () => { cancelled = true; cleanup(); };
  }, []);

  const formatDuration = (since) => {
    if (!since) return '';
    const s = Math.floor((Date.now() - since.getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
  };

  const color = STATUS_COLORS[state];
  const label = STATUS_LABELS[state];

  const styles = {
    wrap: { padding: '16px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#e0e0e0', minHeight: '140px' },
    header: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
    dot: { width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', boxShadow: state > 0 ? `0 0 6px ${color}` : 'none' },
    statusLabel: { fontSize: '14px', fontWeight: 600, color },
    info: { fontSize: '12px', color: '#999', lineHeight: '1.8', fontFamily: 'monospace' },
    infoValue: { color: '#ccc' },
    activeTab: { color: '#0af', fontSize: '12px', fontFamily: 'monospace', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    btn: { marginTop: '12px', padding: '6px 14px', border: '1px solid #555', borderRadius: '4px', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' },
    btnPrimary: { marginTop: '12px', padding: '6px 14px', border: '1px solid #0af', borderRadius: '4px', background: 'rgba(0,170,255,0.1)', color: '#0af', cursor: 'pointer', fontSize: '12px' },
    errText: { color: '#f55', fontSize: '12px', marginTop: '8px' },
    desc: { color: '#777', fontSize: '12px', marginTop: '8px', lineHeight: '1.5' },
  };

  return html`
    <div style=${styles.wrap}>
      <div style=${styles.header}>
        <span style=${styles.dot}></span>
        <span style=${styles.statusLabel}>${label}</span>
      </div>

      ${state === STATES.DISCONNECTED && html`
        <div style=${styles.desc}>
          ${errMsg
            ? html`<div style=${styles.errText}>${errMsg}</div>`
            : 'No local browser detected. Launch Chrome with remote debugging to enable relay.'
          }
        </div>
        <${DownloadSection} styles=${styles} />
        <button style=${{ ...styles.btn, marginTop: '8px' }} onclick=${startRelay}>
          ↻ Retry
        </button>
      `}

      ${state === STATES.CONNECTING && html`
        <div style=${styles.info}>
          Local CDP detected on :9222<br/>
          Establishing relay tunnel...
        </div>
      `}

      ${(state === STATES.CONNECTED || state === STATES.AGENT_ACTIVE) && html`
        <div style=${styles.info}>
          ${state === STATES.AGENT_ACTIVE && activeTab
            ? html`<div style=${styles.activeTab}>OpenClaw controlling: ${activeTab}</div>`
            : html`<span>Waiting for OpenClaw...</span><br/>`
          }
          <span style=${styles.infoValue}>${tabCount}</span> tabs available
          <br/>
          <span style=${styles.infoValue}>${msgCount}</span> messages proxied
          ${connectedSince && html`<br/>Since <span style=${styles.infoValue}>${connectedSince.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>`}
          ${latency !== null && html`<br/>Latency: <span style=${styles.infoValue}>${latency}ms</span>`}
        </div>
        <button style=${styles.btn} onclick=${cleanup}>
          ⏹ Disconnect
        </button>
      `}
    </div>
  `;
}
