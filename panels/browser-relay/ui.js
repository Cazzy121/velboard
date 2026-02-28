import { html, useState, useEffect, useRef } from '/core/vendor/preact-htm.js';

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

const STATE_CONFIG = {
  disconnected: { color: '#666', icon: '⚫', label: 'Not connected' },
  connected:    { color: '#22c55e', icon: '🟢', label: 'Browser connected' },
  agent_active: { color: '#0af', icon: '🤖', label: 'AI is using your browser' },
};

const USE_CASES = [
  { emoji: '🔍', title: 'Web Research', desc: 'Ask Ram to research competitors, find suppliers, or gather market data' },
  { emoji: '📧', title: 'Email & Messages', desc: 'Check emails, draft replies, or scan for important updates' },
  { emoji: '🛒', title: 'Shopping & Comparison', desc: '"Find the best price for X across 5 sites"' },
  { emoji: '✈️', title: 'Travel & Booking', desc: 'Search flights, compare hotels, find the best deals' },
  { emoji: '📊', title: 'Data Collection', desc: 'Scrape product listings, pull specs, build comparison sheets' },
  { emoji: '📝', title: 'Form Filling', desc: 'Fill out repetitive forms, applications, or registrations' },
];

export default function BrowserRelayPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  const [status, setStatus] = useState({ state: 'disconnected' });
  const [showGuide, setShowGuide] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const resp = await fetch('/relay/status');
        if (resp.ok) setStatus(await resp.json());
      } catch(e) {}
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const cfg = STATE_CONFIG[status.state] || STATE_CONFIG.disconnected;
  const platform = detectPlatform();
  const others = ALL_PLATFORMS.filter(p => p !== platform);

  const sinceText = status.connectedSince
    ? 'since ' + new Date(status.connectedSince).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const s = {
    wrap: { padding: '20px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#e0e0e0' },
    // Title
    title: { fontSize: '15px', fontWeight: 700, color: '#e0e0e0', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' },
    subtitle: { fontSize: '12px', color: '#888', marginBottom: '16px', lineHeight: '1.5' },
    // Status
    statusRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
    dot: { width: '10px', height: '10px', borderRadius: '50%', background: cfg.color, display: 'inline-block', boxShadow: status.state !== 'disconnected' ? `0 0 8px ${cfg.color}` : 'none', flexShrink: 0 },
    statusLabel: { fontSize: '14px', fontWeight: 600, color: cfg.color },
    meta: { fontSize: '11px', color: '#777', marginBottom: '14px' },
    activeTab: { color: '#0af', fontSize: '12px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '10px', padding: '6px 10px', background: 'rgba(0,170,255,0.08)', borderRadius: '6px', border: '1px solid rgba(0,170,255,0.15)' },
    // Steps
    stepsBox: { background: '#1a1a24', borderRadius: '8px', padding: '14px', marginBottom: '14px', border: '1px solid #2a2a35' },
    stepRow: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' },
    stepNum: { width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(0,170,255,0.12)', color: '#0af', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    stepText: { fontSize: '12px', color: '#bbb', lineHeight: '1.5', paddingTop: '2px' },
    stepBold: { color: '#e0e0e0', fontWeight: 600 },
    // Buttons
    btn: { padding: '8px 16px', border: '1px solid #0af', borderRadius: '6px', background: 'rgba(0,170,255,0.1)', color: '#0af', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' },
    btnRow: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' },
    // Guide toggle
    guideToggle: { color: '#0af', fontSize: '12px', cursor: 'pointer', opacity: 0.8, userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' },
    // Use cases
    useCaseGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' },
    useCaseCard: { background: '#1a1a24', borderRadius: '8px', padding: '10px 12px', border: '1px solid #2a2a35' },
    useCaseEmoji: { fontSize: '16px', marginBottom: '4px' },
    useCaseTitle: { fontSize: '12px', fontWeight: 600, color: '#ddd', marginBottom: '3px' },
    useCaseDesc: { fontSize: '11px', color: '#888', lineHeight: '1.4' },
    // Other platforms
    otherLink: { color: '#0af', fontSize: '11px', cursor: 'pointer', textDecoration: 'none', opacity: 0.6 },
    divider: { height: '1px', background: '#2a2a35', margin: '14px 0' },
    section: { marginBottom: '14px' },
  };

  return html`
    <div style=${s.wrap}>
      <!-- Title -->
      <div style=${s.title}>
        🌐 Browser Remote Control
      </div>
      <div style=${s.subtitle}>
        Let your AI control a browser on your computer — from anywhere.
      </div>

      <!-- Status -->
      <div style=${s.statusRow}>
        <span style=${s.dot}></span>
        <span style=${s.statusLabel}>${cfg.label}</span>
      </div>

      ${sinceText && html`<div style=${s.meta}>${sinceText}${status.msgCount ? ` · ${status.msgCount} actions` : ''}</div>`}
      ${status.activeTab && html`<div style=${s.activeTab}>🤖 Working on: ${status.activeTab}</div>`}

      ${status.state === 'disconnected' && html`
        <!-- How it works steps -->
        <div style=${s.stepsBox}>
          <div style=${s.stepRow}>
            <div style=${s.stepNum}>1</div>
            <div style=${s.stepText}><span style=${s.stepBold}>Download & run</span> the launcher on your computer</div>
          </div>
          <div style=${s.stepRow}>
            <div style=${s.stepNum}>2</div>
            <div style=${s.stepText}><span style=${s.stepBold}>Pair</span> — send the 6-digit code shown in Chrome to Ram on Telegram</div>
          </div>
          <div style=${{ ...s.stepRow, marginBottom: 0 }}>
            <div style=${s.stepNum}>3</div>
            <div style=${s.stepText}><span style=${s.stepBold}>Done!</span> Your AI can now control the browser remotely</div>
          </div>
        </div>
      `}

      <!-- Download buttons -->
      <div style=${s.btnRow}>
        ${platform ? html`
          <button style=${s.btn} onclick=${() => window.open('/relay/download?platform=' + platform, '_blank')}>
            ⬇ Download for ${PLATFORM_LABELS[platform]}
          </button>
        ` : html`
          ${ALL_PLATFORMS.map(p => html`
            <button style=${s.btn} onclick=${() => window.open('/relay/download?platform=' + p, '_blank')}>
              ⬇ ${PLATFORM_LABELS[p]}
            </button>
          `)}
        `}
        ${platform && html`
          <span style=${s.guideToggle} onclick=${() => setShowOther(!showOther)}>
            ${showOther ? '▾' : '▸'} Other platforms
          </span>
        `}
      </div>
      ${showOther && platform && html`
        <div style=${{ display: 'flex', gap: '12px', marginBottom: '14px', marginTop: '-6px' }}>
          ${others.map(p => html`
            <a href=${'/relay/download?platform=' + p} style=${s.otherLink}>⬇ ${PLATFORM_LABELS[p]}</a>
          `)}
        </div>
      `}

      <!-- Learn more / Use cases -->
      <div>
        <span style=${s.guideToggle} onclick=${() => setShowGuide(!showGuide)}>
          ${showGuide ? '▾' : '▸'} What can I do with this?
        </span>
      </div>

      ${showGuide && html`
        <div style=${s.useCaseGrid}>
          ${USE_CASES.map(uc => html`
            <div style=${s.useCaseCard}>
              <div style=${s.useCaseEmoji}>${uc.emoji}</div>
              <div style=${s.useCaseTitle}>${uc.title}</div>
              <div style=${s.useCaseDesc}>${uc.desc}</div>
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}
