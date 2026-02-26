import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

const shortModel = (m) => {
  if (!m) return '';
  return m.replace('anthropic/', '').replace('google/', '').replace(/-2025\d{4}/g, '');
};

export default function ModelsPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  const d = data || { primary: '—' };

  const rows = [
    { label: 'Primary', model: d.primary },
    ...(d.fallbacks || []).map((m, i) => ({ label: `Fallback ${i + 1}`, model: m })),
    ...(d.subagent ? [{ label: 'Sub-agents', model: d.subagent }] : []),
    ...(d.heartbeat ? [{ label: 'Heartbeat', model: d.heartbeat }] : []),
  ];

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <div class=${cls('title')} style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent)"></span>
        Models
      </div>
      ${rows.map(r => html`
        <div class=${cls('row')} style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.03)">
          <span style="font-size:11px;color:var(--text-dim)">${r.label}</span>
          <span style="font-size:12px;font-weight:500;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,0.05)">${shortModel(r.model)}</span>
        </div>
      `)}
      <div class=${cls('meta')} style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">
        ${d.channel && html`<span>📡 ${d.channel}</span>`}
        ${d.context && html`<span>📚 ${d.context} context</span>`}
        ${d.heartbeatInterval && html`<span>💓 ${d.heartbeatInterval}</span>`}
      </div>
    </div>
  `;
}
