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

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const fmtNextRun = (iso) => {
  if (!iso) return '—';
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'now';
  const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60);
  const dateStr = fmtDate(iso);
  if (hrs < 1) return `${dateStr} (in ${mins}m)`;
  if (hrs < 24) return `${dateStr} (in ${hrs}h ${mins % 60}m)`;
  return dateStr;
};

const shortModel = (m) => m ? m.replace('anthropic/','').replace('google/','').replace(/-2025\d{4}/g,'') : '';

const statusInfo = (j) => {
  if (!j.enabled) return { color: 'var(--text-dim)', label: 'Disabled', bg: 'rgba(255,255,255,0.05)' };
  if (j.lastStatus === 'ok') return { color: 'var(--green)', label: 'HEALTHY', bg: 'rgba(76,175,80,0.12)' };
  if (j.lastStatus === 'error') return { color: 'var(--red)', label: 'ERROR', bg: 'rgba(244,67,54,0.12)' };
  return { color: 'var(--yellow)', label: 'PENDING', bg: 'rgba(255,193,7,0.12)' };
};

const Row = ({ label, value, mono }) => html`
  <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">
    <span style="color:var(--text-dim);font-size:11px">${label}</span>
    <span style="font-size:11px;color:var(--text);${mono ? "font-family:'JetBrains Mono',monospace;" : ''}">${value}</span>
  </div>
`;

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
  const errs = jobs.filter(j => j.enabled && j.lastStatus === 'error').length;
  const off = jobs.filter(j => !j.enabled).length;

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const cronAction = async (jobId, action) => {
    try {
      await api.fetch('/api/crons/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action })
      });
    } catch {}
  };

  const summary = `${active} active` + (errs ? ` · ${errs} ⚠` : '') + (off ? ` · ${off} off` : '');
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
          <div class=${cls('filters')} style="display:flex;gap:6px;margin-bottom:12px">
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
              <div class=${cls('job')} style="margin-bottom:2px">
                <div class=${cls('job-row')} onClick=${() => toggle(j.id)} style="display:flex;align-items:center;gap:8px;padding:7px 0;cursor:pointer;opacity:${j.enabled ? 1 : 0.4}">
                  <span style="width:8px;height:8px;border-radius:50%;background:${si.color};flex-shrink:0"></span>
                  <span style="flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.name}</span>
                  <span style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">${fmtAgo(j.lastRunAt)}${j.lastDurationMs ? ' · ' + (j.lastDurationMs / 1000).toFixed(1) + 's' : ''}</span>
                  <span style="font-size:10px;transition:transform 0.2s;transform:rotate(${isOpen ? '90' : '0'}deg)">▶</span>
                </div>
                ${isOpen && html`
                  <div class=${cls('job-detail')} style="padding:8px 12px 12px;margin:2px 0 8px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.04)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                      <span style="font-size:11px;color:var(--text-dim)">Status</span>
                      <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;background:${si.bg};color:${si.color};letter-spacing:0.5px">${si.label}</span>
                    </div>
                    ${j.lastStatus === 'ok' && html`<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px;opacity:0.7">Last run completed successfully.</div>`}
                    ${j.lastError && j.consecutiveErrors > 0 && html`<div style="font-size:10px;color:var(--red);margin-bottom:8px;opacity:0.8">${j.lastError}</div>`}
                    <${Row} label="Schedule" value=${fmtSchedule(j.schedule)} mono />
                    ${j.model && html`<${Row} label="Model" value=${shortModel(j.model)} mono />`}
                    ${j.sessionTarget && html`<${Row} label="Session" value=${j.sessionTarget} mono />`}
                    ${j.lastRunAt && html`<${Row} label="Last Run" value=${fmtDate(j.lastRunAt)} mono />`}
                    ${j.lastDurationMs && html`<${Row} label="Duration" value=${(j.lastDurationMs / 1000).toFixed(1) + 's'} mono />`}
                    ${j.nextRunAt && html`<${Row} label="Next Run" value=${fmtNextRun(j.nextRunAt)} mono />`}
                    <div style="display:flex;gap:8px;margin-top:10px">
                      <button onClick=${(e) => { e.stopPropagation(); cronAction(j.id, 'run'); }} style="padding:4px 12px;font-size:10px;border-radius:6px;border:1px solid var(--green);background:transparent;color:var(--green);cursor:pointer;display:flex;align-items:center;gap:4px">▶ Run Now</button>
                      <button onClick=${(e) => { e.stopPropagation(); cronAction(j.id, j.enabled ? 'disable' : 'enable'); }} style="padding:4px 12px;font-size:10px;border-radius:6px;border:1px solid ${j.enabled ? 'var(--red)' : 'var(--green)'};background:transparent;color:${j.enabled ? 'var(--red)' : 'var(--green)'};cursor:pointer;display:flex;align-items:center;gap:4px">${j.enabled ? '⏸ Disable' : '▶ Enable'}</button>
                    </div>
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
