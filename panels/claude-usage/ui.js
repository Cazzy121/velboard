import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

const barColor = (pct) => pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--yellow)' : 'var(--red)';

const labels = {
  five_hour: '5-Hour Session',
  seven_day: '7-Day Weekly',
  seven_day_opus: 'Opus',
  seven_day_sonnet: 'Sonnet'
};

const fmtResetTime = (iso) => {
  if (!iso) return '';
  const diff = new Date(iso) - new Date();
  if (diff <= 0) return 'Resetting…';
  const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60);
  if (hrs < 1) return 'in ' + mins + 'm';
  if (hrs < 24) return 'in ' + hrs + 'h ' + (mins % 60) + 'm';
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const fmtFetchedAt = (iso) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm ago';
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

export default function ClaudeUsagePanel({ data, error, connected, lastUpdate, api, config, cls }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.fetch('/api/usage/refresh', { method: 'POST' });
    } catch {}
    setTimeout(() => setRefreshing(false), 2000);
  };

  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  const d = data || { five_hour: { utilization_pct: 0 }, seven_day: { utilization_pct: 0 } };

  const keys = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet'];
  const cards = keys.filter(k => d[k] && d[k].utilization_pct != null);

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <div class=${cls('header')} style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span class=${cls('title')}>
          <span class=${cls('dot')} style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);vertical-align:middle;margin-right:8px"></span>
          Claude Usage
        </span>
        <span style="font-size:9px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:3px;opacity:0.5">
          ${data ? fmtFetchedAt(d.fetched_at) : ''}
          <button onClick=${handleRefresh} style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--text-dim);opacity:${refreshing ? 0.3 : 0.7};padding:1px 3px;transition:opacity 0.2s" disabled=${refreshing}>↻</button>
        </span>
      </div>
      <div class=${cls('grid')} style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${cards.map(k => {
          const info = d[k];
          const pct = info.utilization_pct;
          const color = barColor(pct);
          return html`
            <div class=${cls('card')} style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:12px">
              <div class=${cls('card-label')} style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim)">${labels[k]}</div>
              <div class=${cls('card-value')} style="color:${color};font-size:22px;font-weight:600">${pct}%</div>
              <div class=${cls('bar')} style="margin-top:6px;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
              </div>
              <div class=${cls('card-sub')} style="margin-top:4px;font-size:10px;color:var(--text-dim)">${fmtResetTime(info.resets_at)}</div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
