import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

export default function TokenSwapPanel({ data, error, connected, lastUpdate, api, cls }) {
  const [tokens, setTokens] = useState([]);
  const [active, setActive] = useState('');
  const [dflt, setDflt] = useState('');
  const [switching, setSwitching] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      const r = await api.fetch('/token-swap/api/status');
      if (!r.ok) { console.error('[token-swap] status failed:', r.status); return; }
      const d = await r.json();
      setTokens(d.tokens || []);
      setActive(d.active_name || '');
      setDflt(d.default_name || '');
    } catch (e) { console.error('[token-swap] load error:', e); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (data) load(); }, [data]);

  const doSwitch = async (name) => {
    setSwitching(name);
    setConfirm(null);
    try {
      await api.fetch('/token-swap/api/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      await load();
    } catch {}
    setSwitching(null);
  };

  const tokenParam = new URLSearchParams(window.location.search).get('token');
  const swapUrl = '/token-swap/' + (tokenParam ? '?token=' + encodeURIComponent(tokenParam) : '');

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent)"></span>
          API Token
        </span>
        <a href=${swapUrl} style="font-size:10px;color:var(--accent);text-decoration:none;opacity:0.8">Manage →</a>
      </div>

      ${tokens.length === 0 && html`
        <div style="font-size:12px;color:var(--text-dim);padding:8px 0">No tokens configured</div>
      `}

      <div style="display:flex;flex-direction:column;gap:6px">
        ${tokens.map(t => html`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;background:${t.is_active ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)'};border:1px solid ${t.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)'}">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${t.is_active ? 'var(--green)' : 'rgba(255,255,255,0.1)'}"></span>
              <span style="font-size:13px;font-weight:${t.is_active ? '600' : '400'};font-family:'JetBrains Mono',monospace">${t.name}</span>
              ${t.is_default && html`<span style="font-size:10px;opacity:0.6">⭐</span>`}
            </div>
            <div>
              ${t.is_active
                ? html`<span style="font-size:10px;color:var(--green);font-weight:500">ACTIVE</span>`
                : confirm === t.name
                  ? html`
                    <span style="display:flex;gap:6px;align-items:center">
                      <button onClick=${() => doSwitch(t.name)} style="font-size:10px;padding:2px 10px;background:var(--green);color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:600" disabled=${switching === t.name}>${switching === t.name ? '...' : 'Yes'}</button>
                      <button onClick=${() => setConfirm(null)} style="font-size:10px;padding:2px 8px;background:rgba(255,255,255,0.06);color:var(--text-dim);border:none;border-radius:4px;cursor:pointer">No</button>
                    </span>`
                  : html`<button onClick=${() => setConfirm(t.name)} style="font-size:10px;padding:2px 10px;background:rgba(255,255,255,0.06);color:var(--text);border:none;border-radius:4px;cursor:pointer">Switch</button>`
              }
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}
