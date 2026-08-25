// ===== Payments view — month register, overdue chasing, credit allocation =====
// The register is the owner's month-end reconciliation surface. Every cell
// is a chip with text AND colour (colour alone never carries meaning).

import { sb, run, fetchAll, rpc } from '../supabase.js';
import { toast, openModal, chip } from '../lib/ui.js';
import { esc, fmtZAR, fmtMonth, monthKey, addMonths, todaySAST, fmtDate, fmtPhone } from '../lib/fmt.js';
import { openRecordPaymentModal } from '../lib/payments-ui.js';

export async function render(container) {
  // Idempotent auto-generation of the current month (CLAUDE.md money rules).
  try { await rpc('generate_charges', { target_month: todaySAST().slice(0, 8) + '01' }); } catch (e) { console.warn(e); }

  let students = [], fees = [], credits = [];
  try {
    students = await fetchAll(sb.from('students').select('*').order('name'));
    fees = await fetchAll(sb.from('fee_status').select('*'));
    credits = await fetchAll(sb.from('payments').select('*').is('charge_id', null).order('paid_on'));
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Couldn't load payments: ${esc(e.message)}</p></div>`;
    return {};
  }

  const byStudent = new Map(students.map(s => [s.id, s]));
  const months = [-2, -1, 0, 1, 2].map(o => addMonths(monthKey(new Date()), o));

  // fee_status grouped per student × month
  const cellMap = new Map(); // key: studentId|month
  for (const f of fees) {
    const mk = String(f.month).slice(0, 7);
    const key = f.student_id + '|' + mk;
    if (!cellMap.has(key)) cellMap.set(key, { total: 0, paid: 0, charges: [], status: 'paid' });
    const cell = cellMap.get(key);
    cell.total += Number(f.amount);
    cell.paid += Number(f.paid);
    cell.charges.push(f);
    const rank = { unpaid: 0, partial: 1, paid: 2 };
    if (rank[f.status] < rank[cell.status]) cell.status = f.status;
  }

  const overdueStudents = students
    .map(s => {
      const items = fees.filter(f => f.student_id === s.id && f.overdue && f.status !== 'paid');
      if (!items.length) return null;
      const total = items.reduce((t, f) => t + Number(f.amount) - Number(f.paid), 0);
      const mkSet = [...new Set(items.map(f => String(f.month).slice(0, 7)))].sort();
      const subjects = [...new Set(items.map(f => f.subject))];
      return { student: s, total, months: mkSet, subjects };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  const unallocatedTotal = credits.reduce((t, p) => t + Number(p.amount), 0);

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Payments</h2>
        <p class="lede">Month register: one row per learner, one column per month. Tap a cell to record or allocate a payment.</p>
      </div>
      <div class="head-actions">
        ${unallocatedTotal > 0 ? `<a class="btn btn-ghost" href="#unallocated">Unallocated credit: ${fmtZAR(unallocatedTotal)}</a>` : ''}
        <a class="btn btn-dark" href="#overdue">${overdueStudents.length} overdue →</a>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Learner</th>
            ${months.map(m => `<th class="num">${fmtMonth(m)}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td class="strong"><a href="#/students?id=${s.id}">${esc(s.name)}</a><br /><span class="muted">Gr ${esc(s.grade)} · ${(s.subjects || []).map(x => x === 'maths' ? 'M' : 'P').join('+') || '—'}</span></td>
                ${months.map(mk => {
                  const cell = cellMap.get(s.id + '|' + mk);
                  if (!cell) return '<td class="num"><span class="chip chip-neutral">—</span></td>';
                  return `<td class="num"><button class="chip chip-${cell.status}" data-cell="${s.id}|${mk}" style="cursor:pointer">${cell.status} ${fmtZAR(cell.total)}</button></td>`;
                }).join('')}
              </tr>`).join('') || '<tr><td colspan="6"><p class="empty">No students yet — add one from the Students page.</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" id="unallocated">
      <h3>Unallocated credit</h3>
      <p class="helper" style="margin-top:4px">Payments recorded without a specific charge. Allocate them to a month below.</p>
      ${credits.length ? `
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Learner</th><th>Date</th><th class="num">Amount</th><th>Reference</th><th class="num">Allocate to…</th></tr></thead>
          <tbody>
            ${credits.map(p => {
              const st = byStudent.get(p.student_id);
              return `<tr>
                <td>${st ? `<a href="#/students?id=${st.id}">${esc(st.name)}</a>` : '<span class="muted">(deleted)</span>'}</td>
                <td>${fmtDate(p.paid_on)}</td>
                <td class="num strong">${fmtZAR(p.amount)}</td>
                <td class="muted">${esc(p.reference || '')}</td>
                <td class="num"><button class="btn btn-ghost btn-sm" data-alloc="${p.id}">Allocate</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">No unallocated payments.</p>'}
    </div>

    <div class="card" id="overdue">
      <h3>Overdue <span class="helper">(unpaid past the grace period)</span></h3>
      ${overdueStudents.length ? `
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Learner</th><th>Parent</th><th>Months</th><th>Subjects</th><th class="num">Outstanding</th><th class="num">Actions</th></tr></thead>
          <tbody>
            ${overdueStudents.map(({ student: s, total, months: mks, subjects }) => `
              <tr>
                <td class="strong">${esc(s.name)}</td>
                <td>${esc(s.parent_name)}<br /><span class="muted">${fmtPhone(s.whatsapp_override || s.parent_phone)}</span></td>
                <td>${mks.map(m => fmtMonth(m)).join(', ')}</td>
                <td>${subjects.map(x => esc(x)).join(', ')}</td>
                <td class="num strong">${fmtZAR(total)}</td>
                <td class="num"><div class="row-actions">
                  <a class="btn btn-wa btn-sm" href="#/communications?remind=${s.id}">Remind</a>
                  <button class="btn btn-ghost btn-sm" data-pay="${s.id}" type="button">Record</button>
                </div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">Nothing overdue. Everyone who owes is inside the grace period.</p>'}
    </div>`;

  // Cell popup: that month's charges for the student + credit allocation
  container.querySelectorAll('[data-cell]').forEach(btn => btn.addEventListener('click', async () => {
    const [sid, mk] = btn.dataset.cell.split('|');
    const st = byStudent.get(sid);
    const cell = cellMap.get(sid + '|' + mk);
    if (!cell || !st) return;

    const body = document.createElement('div');
    body.innerHTML = `
      <p class="helper" style="margin-top:0">${esc(st.name)} — ${fmtMonth(mk)}</p>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Subject</th><th class="num">Amount</th><th class="num">Paid</th><th>Status</th><th class="num">Action</th></tr></thead>
          <tbody>
            ${cell.charges.map(c => `
              <tr>
                <td class="strong">${esc(c.subject)}${c.kind === 'oneoff' ? ' <span class="muted">(one-off)</span>' : ''}</td>
                <td class="num">${fmtZAR(c.amount)}</td>
                <td class="num">${fmtZAR(c.paid)}</td>
                <td>${chip(c.status)}</td>
                <td class="num"><button class="btn btn-ghost btn-sm" data-paycharge="${c.charge_id}" type="button">Record</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="helper">Unallocated credit for this learner:</p>
      <div id="creditRows">
        ${credits.filter(p => p.student_id === sid).map(p => `
          <div class="toolbar" style="margin-bottom:6px">
            <span class="chip chip-neutral">${fmtZAR(p.amount)} · ${fmtDate(p.paid_on)}</span>
            <select class="select alloc-sel" data-credit="${p.id}">
              <option value="">Choose a charge…</option>
              ${cell.charges.map(c => `<option value="${c.charge_id}">${esc(c.subject)} ${fmtMonth(mk)} (${fmtZAR(c.amount)})</option>`).join('')}
            </select>
          </div>`).join('') || '<p class="empty">None.</p>'}
      </div>`;

    const foot = document.createElement('div');
    foot.className = 'modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.className = 'btn btn-ghost'; closeBtn.textContent = 'Close';
    foot.append(closeBtn);

    const { el, close } = openModal({
      title: `${st.name} — ${fmtMonth(mk)}`,
      body,
      footer: foot,
    });
    closeBtn.addEventListener('click', close);

    body.querySelectorAll('[data-paycharge]').forEach(b => b.addEventListener('click', async () => {
      const charge = cell.charges.find(c => c.charge_id === b.dataset.paycharge);
      await openRecordPaymentModal({
        student: st,
        charge: { id: charge.charge_id, amount: charge.amount, paid: charge.paid },
        onSaved: () => { window.reloadView(); },
      });
    }));

    body.querySelectorAll('.alloc-sel').forEach(sel => sel.addEventListener('change', async () => {
      const chargeId = sel.value;
      if (!chargeId) return;
      const { error } = await sb.from('payments').update({ charge_id: chargeId }).eq('id', sel.dataset.credit);
      if (error) { toast(error.message, 'err'); return; }
      toast('Credit allocated');
      window.reloadView();
    }));
  }));

  // Overdue row quick actions
  container.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', async () => {
    const st = byStudent.get(b.dataset.pay);
    await openRecordPaymentModal({ student: st, onSaved: () => { window.reloadView(); } });
  }));

  return { destroy() {} };
}
