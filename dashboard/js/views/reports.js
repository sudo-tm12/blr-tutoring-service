// ===== Reports view — revenue, register rollup, attendance, lead funnel =====
// Every table exports to CSV (Excel-safe, BOM-prefixed). Exporting students +
// payments monthly is also the owner's backup habit (see README).

import { sb, fetchAll } from '../supabase.js';
import { esc, fmtZAR, fmtMonth, monthKey, addMonths, todaySAST } from '../lib/fmt.js';
import { barChart } from '../lib/charts.js';
import { downloadCSV } from '../lib/csv.js';

const LEAD_STATUSES = ['new', 'contacted', 'trial', 'enrolled', 'lost', 'closed'];

export async function render(container) {
  let students = [], payments = [], fees = [], sessions = [], attendance = [], leads = [];
  try {
    [students, payments, fees, sessions, attendance, leads] = await Promise.all([
      fetchAll(sb.from('students').select('*').order('name')),
      fetchAll(sb.from('payments').select('*').order('paid_on')),
      fetchAll(sb.from('fee_status').select('*')),
      fetchAll(sb.from('sessions').select('*').order('session_date', { ascending: false })),
      fetchAll(sb.from('attendance').select('*')),
      fetchAll(sb.from('leads').select('*').order('created_at', { ascending: false })),
    ]);
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Couldn't load reports: ${esc(e.message)}</p></div>`;
    return {};
  }

  // ---- Revenue: last 6 months, collected vs outstanding ----
  const thisMk = monthKey(new Date());
  const last6 = [5, 4, 3, 2, 1, 0].map(o => addMonths(thisMk, -o));
  const collectedByMonth = Object.fromEntries(last6.map(m => [m, 0]));
  for (const p of payments) {
    const mk = (p.paid_on || '').slice(0, 7);
    if (mk in collectedByMonth) collectedByMonth[mk] += Number(p.amount);
  }
  const chargeMonthById = new Map(fees.map(f => [f.charge_id, String(f.month).slice(0, 7)]));
  const outstandingByMonth = Object.fromEntries(last6.map(m => [m, 0]));
  for (const m of last6) {
    const billed = fees.filter(f => String(f.month).slice(0, 7) === m).reduce((t, f) => t + Number(f.amount), 0);
    const allocated = payments
      .filter(p => p.charge_id && chargeMonthById.get(p.charge_id) === m)
      .reduce((t, p) => t + Number(p.amount), 0);
    outstandingByMonth[m] = Math.max(0, billed - allocated);
  }

  // ---- Register rollup: current month ----
  const cur = fees.filter(f => String(f.month).slice(0, 7) === thisMk);
  const expected = cur.reduce((t, f) => t + Number(f.amount), 0);
  const collected = cur.reduce((t, f) => t + Number(f.paid), 0);
  const outstanding = Math.max(0, expected - collected);
  const notPaid = cur.filter(f => f.status !== 'paid').length;
  const overdueCount = fees.filter(f => f.overdue && f.status !== 'paid').length;

  // ---- Attendance: last 30 days per learner ----
  const today = todaySAST();
  const cutoffD = new Date(today + 'T00:00:00Z');
  cutoffD.setUTCDate(cutoffD.getUTCDate() - 30);
  const cutoff = cutoffD.toISOString().slice(0, 10);
  const recentSessionIds = new Set(sessions.filter(s => s.session_date >= cutoff && s.session_date <= today).map(s => s.id));
  const byStudent = new Map(students.map(s => [s.id, s]));
  const attStats = new Map(); // studentId -> {att, total}
  for (const a of attendance) {
    if (!recentSessionIds.has(a.session_id) || !byStudent.has(a.student_id)) continue;
    if (!attStats.has(a.student_id)) attStats.set(a.student_id, { att: 0, total: 0 });
    const st = attStats.get(a.student_id);
    if (a.status === 'present' || a.status === 'late') { st.att++; st.total++; }
    else if (a.status === 'absent') st.total++;
  }
  const attRows = [...attStats.entries()]
    .map(([sid, st]) => ({ student: byStudent.get(sid), pct: st.total ? Math.round((st.att / st.total) * 100) : null, ...st }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));

  // ---- Lead funnel ----
  const leadTotal = Math.max(1, leads.length);
  const funnel = LEAD_STATUSES.map(s => ({ s, n: leads.filter(l => l.status === s).length }));

  // ---- Paint ----
  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Reports</h2>
        <p class="lede">The month at a glance, plus CSV exports of everything (also your backup habit — download monthly).</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-ghost btn-sm" id="csvStudents" type="button">Students CSV</button>
        <button class="btn btn-ghost btn-sm" id="csvPayments" type="button">Payments CSV</button>
        <button class="btn btn-ghost btn-sm" id="csvRegister" type="button">Register CSV</button>
        <button class="btn btn-ghost btn-sm" id="csvLeads" type="button">Leads CSV</button>
      </div>
    </div>

    <div class="card">
      <h3>Revenue — last 6 months</h3>
      <p class="helper" style="margin-top:4px">Collected = cash in. Outstanding = billed that month, still unpaid.</p>
      <div id="revChart"></div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="stat-num">${fmtZAR(expected)}</div><div class="stat-cap">Billed · ${fmtMonth(thisMk)}</div></div>
      <div class="stat cool"><div class="stat-num">${fmtZAR(collected)}</div><div class="stat-cap">Collected · ${fmtMonth(thisMk)}</div></div>
      <div class="stat warm"><div class="stat-num">${fmtZAR(outstanding)}</div><div class="stat-cap">Outstanding · ${fmtMonth(thisMk)}</div></div>
      <div class="stat warm"><div class="stat-num">${overdueCount}</div><div class="stat-cap">Overdue charges</div></div>
      <div class="stat"><div class="stat-num">${notPaid}</div><div class="stat-cap">Unpaid learners · ${fmtMonth(thisMk)}</div></div>
    </div>

    <div class="card">
      <h3>Attendance rate — last 30 days <span class="helper">(present + late ÷ all marks, excused excluded)</span></h3>
      ${attRows.length ? `
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Learner</th><th class="num">Sessions</th><th class="num">Attended</th><th style="width:38%">Rate</th></tr></thead>
          <tbody>
            ${attRows.map(r => `
              <tr>
                <td class="strong">${esc(r.student.name)}</td>
                <td class="num">${r.total}</td>
                <td class="num">${r.att}</td>
                <td>
                  <div class="toolbar">
                    <div style="background:var(--line);border-radius:99px;height:6px;flex:1;overflow:hidden">
                      <div style="width:${r.pct ?? 0}%;height:100%;background:${r.pct === null ? 'var(--line-2)' : r.pct >= 80 ? 'var(--sky)' : 'var(--rust)'}"></div>
                    </div>
                    <span class="muted" style="width:44px;text-align:right">${r.pct === null ? '—' : r.pct + '%'}</span>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">No sessions in the last 30 days.</p>'}
    </div>

    <div class="card">
      <h3>Lead funnel</h3>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Stage</th><th class="num">Count</th><th style="width:50%">Share</th></tr></thead>
          <tbody>
            ${funnel.map(f => `
              <tr>
                <td class="strong" style="text-transform:capitalize">${f.s}</td>
                <td class="num">${f.n}</td>
                <td>
                  <div class="toolbar">
                    <div style="background:var(--line);border-radius:99px;height:6px;flex:1;overflow:hidden">
                      <div style="width:${Math.round((f.n / leadTotal) * 100)}%;height:100%;background:var(--sky)"></div>
                    </div>
                    <span class="muted" style="width:44px;text-align:right">${leads.length ? Math.round((f.n / leads.length) * 100) : 0}%</span>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  barChart(container.querySelector('#revChart'), {
    labels: last6.map(m => {
      const mk = new Date(m + '-01T00:00:00Z');
      return mk.toLocaleDateString('en-ZA', { month: 'short' }) + ' ' + m.slice(2, 4);
    }),
    values: last6.map(m => collectedByMonth[m]),
    values2: last6.map(m => outstandingByMonth[m]),
    format: fmtZAR,
  });

  // ---- CSV exports ----
  const nameOf = id => byStudent.get(id)?.name || '(deleted)';
  container.querySelector('#csvStudents').addEventListener('click', () => {
    downloadCSV('blr-students.csv', students.map(s => ({
      Name: s.name, Grade: s.grade, Subjects: (s.subjects || []).join('+'),
      'Parent name': s.parent_name, Phone: s.parent_phone, Email: s.email || '',
      Status: s.status, Enrolled: s.enrolled_on || '',
      'SMS consent': s.consent_sms ? 'yes' : 'no',
      'Reviews consent': s.consent_reviews ? 'yes' : 'no',
      'Marketing consent': s.consent_marketing ? 'yes' : 'no',
      Notes: s.notes || '',
    })));
  });
  container.querySelector('#csvPayments').addEventListener('click', () => {
    downloadCSV('blr-payments.csv', payments.map(p => ({
      Learner: nameOf(p.student_id), Date: p.paid_on, Amount: p.amount, Method: p.method,
      Reference: p.reference || '',
      'Charge month': p.charge_id ? chargeMonthById.get(p.charge_id) || '' : '(unallocated)',
      Note: p.note || '',
    })));
  });
  const months5 = [-2, -1, 0, 1, 2].map(o => addMonths(thisMk, o));
  container.querySelector('#csvRegister').addEventListener('click', () => {
    const rows = students.map(s => {
      const row = { Learner: s.name, Grade: s.grade, Subjects: (s.subjects || []).join('+') };
      for (const m of months5) {
        const cell = fees.filter(f => f.student_id === s.id && String(f.month).slice(0, 7) === m);
        const billed = cell.reduce((t, f) => t + Number(f.amount), 0);
        const paid = cell.reduce((t, f) => t + Number(f.paid), 0);
        row[fmtMonth(m)] = billed ? `${paid} / ${billed}` : '';
      }
      return row;
    });
    downloadCSV('blr-register.csv', rows);
  });
  container.querySelector('#csvLeads').addEventListener('click', () => {
    downloadCSV('blr-leads.csv', leads.map(l => ({
      Name: l.name, Phone: l.phone, Grade: l.grade || '', Subject: l.subject || '',
      Source: l.source, Status: l.status, Created: (l.created_at || '').slice(0, 10),
      'Last contact': l.last_contact_on || '', Notes: l.notes || '',
    })));
  });

  return { destroy() {} };
}
