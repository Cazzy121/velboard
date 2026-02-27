import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

const fmtUptime = (s) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
};

export default function UptimePanel({ data, error, connected, lastUpdate, api, config, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  const d = data || { uptime: 0, hostname: '—' };

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <div class=${cls('icon')}>⏱</div>
      <div class=${cls('label')}>UPTIME</div>
      <div class=${cls('value')} style="color: var(--cyan)">${data ? fmtUptime(d.uptime) : '—'}</div>
      <div class=${cls('sub')}>${d.hostname || ''}</div>
    </div>
  `;
}
