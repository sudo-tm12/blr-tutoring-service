// ===== Overview — the Monday-morning glance =====
// Reuses the same queries as the other views so numbers always match:
// money from fee_status, churn from attendance, reviews from testimonials.

import { sb, fetchAll } from '../supabase.js';
import { esc, fmtZAR, fmtDate, fmtMonth, fmtPhone, monthKey } from '../lib/fmt.js';

export async function render(container) {
  const thisMk = monthKey(new Date());
  let students = [], fees = [], payments = [], leads = [], testimonials = [], sessions = [], attendance = [];
  try {
    [students, fees, payments, leads, testimonials, sessions, attendance] = await Promise.all([
      fetchAll(sb.from('students').select('*').order('name')),
      fetchAll(sb.from('fee_status').select('*')),
      fetchAll(sb.from('payments').select('*').order('paid_on', { ascending: false }).limit(6)),
      fetchAll(sb.from('leads').select('*').order('created_at', { ascending: false }).limit(20)),
      fetchAll(sb.from('testimonials').select('id,status')),
      fetchAll(sb.from('sessions').select('id,session_date').order('session_date', { ascending: false }).limit(60)),
      fetchAll(sb.from('attendance').select('*')),
    ]);
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Couldn't load the overview: ${esc(e.message)}</p></div>`;
    return {};
  }

  // Money: this month
  const cur = fees.filter(f => String(f.month).slice(0, 7) === thisMk);
  const expected = cur.reduce((t, f) => t + Number(f.amount), 0);
  const collected = cur.reduce((t, f) => t + Number(f.paid), 0);
  const outstanding = Math.max(0, expected - collected);
  const overdueCount = fees.filter(f => f.overdue && f.status !== 'paid').length;
  const unpaidCount = cur.filter(f => f.status !== 'paid').length;

  const active = students.filter(s => s.status === 'active').length;
  const pendingT = testimonials.filter(t => t.status === 'pending').length;

  // Churn: absent from the 2 most recent sessions they were marked in
  const sessionDates = new Map(sessions.map(s => [s.id, s.session_date]));
  const bySid = new Map();
  for (const a of attendance) {
    const d = sessionDates.get(a.session_id);
    if (!d) continue;
    const list = bySid.get(a.student_id) || [];
    list.push({ date: d, status: a.status });
    bySid.set(a.student_id, list);
  }
  const atRisk = [];
  for (const [sid, list] of bySid) {
    const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
    if (sorted[0] && sorted[0].status === 'absent' && sorted[1] && sorted[1].status === 'absent') {
      const st = students.find(x => x.id === sid);
      if (st && st.status === 'active') atRisk.push(st);
    }
  }

  const byStudent = new Map(students.map(s => [s.id, s]));
  const recentPayments = payments.filter(p => p.paid_on); // limit(6) covers today+recent
  const recentLeads = leads.filter(l => l.status === 'new' || l.status === 'contacted').slice(0, 5);

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Overview</h2>
        <p class="lede">Good day! Here's the business right now. ${overdueCount ? '<strong>' + overdueCount + ' overdue</strong> — head to Payments → Overdue.' : 'Nothing overdue.'}</p>
      </div>
      <div class="head-actions">
        <a class="btn btn-dark" href="#/students">+ Add student</a>
        <a class="btn btn-ghost" href="#/payments">Record payment</a>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="stat-num">${active}</div><div class="stat-cap">Active learners</div></div>
      <div class="stat cool"><div class="stat-num">${fmtZAR(collected)}</div><div class="stat-cap">Collected · ${fmtMonth(thisMk)}</div></div>
      <div class="stat warm"><div class="stat-num">${fmtZAR(outstanding)}</div><div class="stat-cap">Outstanding · ${fmtMonth(thisMk)}</div></div>
      <div class="stat ${overdueCount ? 'warm' : ''}"><div class="stat-num">${overdueCount}</div><div class="stat-cap">Overdue charges</div></div>
      <div class="stat ${unpaidCount ? 'warm' : ''}"><div class="stat-num">${unpaidCount}</div><div class="stat-cap">Unpaid · ${fmtMonth(thisMk)}</div></div>
      <div class="stat ${pendingT ? 'cool' : ''}"><div class="stat-num">${pendingT}</div><div class="stat-cap">Reviews awaiting approval</div></div>
    </div>

    ${atRisk.length ? `
    <div class="card">
      <h3>Churn watch <span class="helper">(absent from their last 2+ sessions)</span></h3>
      <div class="pills" style="margin-top:8px">
        ${atRisk.map(s => `<a class="pill" href="#/students?id=${s.id}">${esc(s.name)} · Gr ${esc(s.grade)}</a>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <h3>Recent payments</h3>
      ${recentPayments.length ? `
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Learner</th><th>Date</th><th class="num">Amount</th><th>Method</th><th>Reference</th></tr></thead>
          <tbody>
            ${recentPayments.map(p => {
              const st = byStudent.get(p.student_id);
              return `<tr>
                <td class="strong">${st ? `<a href="#/students?id=${st.id}">${esc(st.name)}</a>` : '(deleted)'}</td>
                <td>${fmtDate(p.paid_on)}</td>
                <td class="num strong">${fmtZAR(p.amount)}</td>
                <td>${esc(p.method)}</td>
                <td class="muted">${esc(p.reference || '')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">No payments yet.</p>'}
    </div>

    <div class="card">
      <h3>Leads needing follow-up</h3>
      ${recentLeads.length ? `
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Name</th><th>Phone</th><th>Grade</th><th>Source</th><th>Status</th><th class="num">Actions</th></tr></thead>
          <tbody>
            ${recentLeads.map(l => `
              <tr>
                <td class="strong">${esc(l.name)}</td>
                <td>${fmtPhone(l.phone)}</td>
                <td>${l.grade ? 'Gr ' + esc(l.grade) : '—'}</td>
                <td><span class="chip chip-neutral">${esc(l.source)}</span></td>
                <td><span class="chip chip-neutral">${esc(l.status)}</span></td>
                <td class="num"><a class="btn btn-ghost btn-sm" href="#/leads">Open leads</a></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">Nothing waiting — inbox zero.</p>'}
    </div>

    <div class="card">
      <h3>Quick actions</h3>
      <div class="pills" style="margin-top:8px">
        <a class="pill" href="#/attendance">Take attendance</a>
        <a class="pill" href="#/communications">Send payment reminders</a>
        <a class="pill" href="#/testimonials">${pendingT ? 'Approve ' + pendingT + ' review' + (pendingT === 1 ? '' : 's') : 'Testimonials'}</a>
        <a class="pill" href="#/reports">Download backups (CSV)</a>
        <a class="pill" href="#/settings">Settings</a>
      </div>
    </div>`;

  return { destroy() {} };
}
