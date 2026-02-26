import { html, useState, useEffect, useCallback } from '/core/vendor/preact-htm.js';

const fmtSchedule = (s) => {
  if (!s) return '—';
  if (s.kind === 'cron') return s.expr + (s.tz ? ` (${s.tz.replace('Asia/Calcutta','IST').replace('Asia/Kolkata','IST')})` : '');
  if (s.kind === 'every') {
    const ms = s.everyMs;
    if (ms >= 3600000) return `every ${ms/3600000}h`;
    if (ms >= 60000) return `every ${ms/60000}m`;
    return `every ${ms/1000}s`;
  }
  if (s.kind === 'at') return new Date(s.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return JSON.stringify(s);
};

const fmtAgo = (iso) => {
  if (!iso) return 'never';
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm ago';
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const shortModel = (m) => m ? m.replace('anthropic/','').replace('google/','').replace(/-2025\d{4}/g,'') : '';

const statusInfo = (j) => {
  if (!j.enabled) return { color: 'var(--text-dim)', label: 'Disabled' };
  if (j.lastStatus === 'ok') return { color: 'var(--green)', label: 'Healthy' };
  if (j.lastStatus === 'error') return { color: 'var(--red)', label: 'Error' };
  return { color: 'var(--yellow)', label: 'Pending' };
};

export default function CronsPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [open, setOpen] = useState(false);

  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  const d = data || [];

  const jobs = [...d].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const filtered = filter === 'all' ? jobs
    : filter === 'active' ? jobs.filter(j => j.enabled)
    : filter === 'errors' ? jobs.filter(j => j.enabled && j.lastStatus === 'error')
    : jobs.filter(j => !j.enabled);

  const active = jobs.filter(j => j.enabled).length;
  const errors = jobs.filter(j => j.enabled && j.lastStatus === 'error').length;
  const disabled = jobs.filter(j => !j.enabled).length;

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const summary = `${active} active` + (errors ? ` · ${errors} ⚠` : '') + (disabled ? ` · ${disabled} off` : '');

  const filters = ['all', 'active', 'errors', 'disabled'];

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <button class=${cls('toggle')} onClick=${() => setOpen(!open)} style="display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;color:var(--text);cursor:pointer;padding:8px 0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent)"></span>
        <span>Scheduled Jobs</span>
        <span style="margin-left:auto;display:flex;align-items:center;gap:6px">
          <span style="font-size:10px;color:var(--text-dim);font-weight:400;text-transform:none;letter-spacing:0;font-family:'JetBrains Mono',monospace">${summary}</span>
          <span style="font-size:10px;transition:transform 0.2s;transform:rotate(${open ? '90' : '0'}deg)">▶</span>
        </span>
      </button>
      ${open && html`
        <div class=${cls('body')}>
          <div class=${cls('filters')} style="display:flex;gap:6px;margin-bottom:10px">
            ${filters.map(f => html`
              <button
                class=${cls('filter-btn')}
                onClick=${() => setFilter(f)}
                style="padding:3px 10px;font-size:10px;border-radius:10px;border:1px solid ${filter === f ? 'var(--accent)' : 'rgba(255,255,255,0.1)'};background:${filter === f ? 'var(--accent)' : 'transparent'};color:${filter === f ? '#000' : 'var(--text-dim)'};cursor:pointer;text-transform:capitalize"
              >${f}</button>
            `)}
          </div>
          ${filtered.map(j => {
            const si = statusInfo(j);
            const isOpen = expanded[j.id];
            return html`
              <div class=${cls('job')}>
                <div class=${cls('job-row')} onClick=${() => toggle(j.id)} style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;opacity:${j.enabled ? 1 : 0.4}">
                  <span style="width:8px;height:8px;border-radius:50%;background:${si.color};flex-shrink:0"></span>
                  <span style="flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.name}</span>
                  <span style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">${fmtAgo(j.lastRunAt)}${j.lastDurationMs ? ' · ' + (j.lastDurationMs / 1000).toFixed(1) + 's' : ''}</span>
                  <span style="font-size:10px;transition:transform 0.2s;transform:rotate(${isOpen ? '90' : '0'}deg)">▶</span>
                </div>
                ${isOpen && html`
                  <div class=${cls('job-detail')} style="padding:6px 0 10px 16px;font-size:11px;color:var(--text-dim);border-bottom:1px solid rgba(255,255,255,0.03)">
                    <div style="margin-bottom:4px"><strong style="color:var(--text)">Status:</strong> <span style="color:${si.color}">${si.label}</span></div>
                    <div style="margin-bottom:4px"><strong style="color:var(--text)">Schedule:</strong> ${fmtSchedule(j.schedule)}</div>
                    ${j.model && html`<div style="margin-bottom:4px"><strong style="color:var(--text)">Model:</strong> ${shortModel(j.model)}</div>`}
                    ${j.sessionTarget && html`<div style="margin-bottom:4px"><strong style="color:var(--text)">Session:</strong> ${j.sessionTarget}</div>`}
                    ${j.lastError && j.consecutiveErrors > 0 && html`<div style="color:var(--red);margin-top:4px;font-size:10px">${j.lastError}</div>`}
                  </div>
                `}
              </div>
            `;
          })}
        </div>
      `}
    </div>
  `;
}
