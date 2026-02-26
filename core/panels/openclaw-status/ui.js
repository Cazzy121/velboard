import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

export default function OpenclawStatusPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  if (!data) {
    const rows = [
      { label: 'Status', value: '—' },
      { label: 'Version', value: '—' },
      { label: 'Heartbeat', value: '—' },
      { label: 'Sessions', value: '—' },
      { label: 'Channel', value: '—' },
      { label: 'Memory', value: '—' },
    ];
    return html`
      <div class=${cls('wrap')}>
        <div class=${cls('icon')}>🔧</div>
        <div class=${cls('label')} style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:12px">OPENCLAW STATUS</div>
        ${rows.map(r => html`
          <div class=${cls('row')} style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            <span style="color:var(--text-dim);font-size:12px">${r.label}</span>
            <span style="font-size:12px;font-weight:500;color:var(--text)">${r.value}</span>
          </div>
        `)}
      </div>
    `;
  }

  if (data.error || !data.online) {
    return html`<div class=${cls('offline')} style="color:var(--red);font-size:13px">⛔ Offline — ${data.error || 'unknown'}</div>`;
  }

  const chanName = data.channel?.name || 'unknown';
  const chanOK = (data.channel?.status || '').toUpperCase() === 'ON';

  const rows = [
    { label: 'Status', value: '🟢 Online', style: 'color:var(--green)' },
    { label: 'Version', value: data.version },
    { label: 'Heartbeat', value: data.heartbeat },
    { label: 'Sessions', value: data.sessions },
    { label: 'Channel', value: `${chanName} ${chanOK ? '✅' : '❌'}` },
    { label: 'Memory', value: data.memory },
  ];

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <div class=${cls('icon')}>🔧</div>
      <div class=${cls('label')} style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:12px">OPENCLAW STATUS</div>
      ${rows.map(r => html`
        <div class=${cls('row')} style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="color:var(--text-dim);font-size:12px">${r.label}</span>
          <span style="font-size:12px;font-weight:500;${r.style || 'color:var(--text)'}">${r.value}</span>
        </div>
      `)}
      ${data.security && html`
        <div class=${cls('security')} style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
          <span style="color:var(--text-dim);font-size:12px">Security</span>
          <span style="font-size:12px">
            ${data.security.critical > 0 && html`<span style="color:var(--red)">${data.security.critical} critical</span>`}
            ${data.security.critical > 0 && data.security.warn > 0 && ' · '}
            ${data.security.warn > 0 && html`<span style="color:#f0ad4e">${data.security.warn} warn</span>`}
            ${(data.security.critical > 0 || data.security.warn > 0) && data.security.info > 0 && ' · '}
            ${data.security.info > 0 && html`<span>${data.security.info} info</span>`}
          </span>
        </div>
      `}
    </div>
  `;
}
