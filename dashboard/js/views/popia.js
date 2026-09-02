// ===== POPIA view — consent overview, data export, erasure with audit =====
// Export = the data-subject access request answer (JSON bundle).
// Delete = right to erasure: audit row goes into deleted_students first
// (financial history without contact details), then the student is removed
// and all charges/payments/attendance cascade away.

import { sb, fetchAll } from '../supabase.js';
import { toast, confirmDialog } from '../lib/ui.js';
import { esc, fmtDate } from '../lib/fmt.js';

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function render(container) {
  let students = [];
  try {
    students = await fetchAll(sb.from('students').select('*').order('name'));
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Couldn't load students: ${esc(e.message)}</p></div>`;
    return {};
  }

  const yes = '<span class="chip chip-paid">Yes</span>';
  const no = '<span class="chip chip-neutral">No</span>';

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>POPIA & data</h2>
        <p class="lede">Consent records, access-request exports, and erasure with an audit trail. The full notice lives at <a href="../../privacy.html" target="_blank" rel="noopener">privacy.html</a>.</p>
      </div>
    </div>

    <div class="card">
      <h3>Consent register</h3>
      <p class="helper" style="margin-top:4px">Set when adding/editing a learner in Students. Get fresh consent before using a channel marked No.</p>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Learner</th><th class="num">SMS / WhatsApp</th><th class="num">Reviews</th><th class="num">Marketing</th></tr></thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td class="strong"><a href="#/students?id=${s.id}">${esc(s.name)}</a></td>
                <td class="num">${s.consent_sms ? yes : no}</td>
                <td class="num">${s.consent_reviews ? yes : no}</td>
                <td class="num">${s.consent_marketing ? yes : no}</td>
              </tr>`).join('') || '<tr><td colspan="4"><p class="empty">No students yet.</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Export learner data <span class="helper">(POPIA access request)</span></h3>
      <p class="helper" style="margin-top:4px">Produces a JSON bundle of everything we hold: profile, charges, payments, attendance, and messages sent.</p>
      <div class="toolbar" style="margin-top:10px">
        <select class="select" id="exportSel" style="flex:1;max-width:320px">
          ${students.map(s => `<option value="${s.id}">${esc(s.name)} — Gr ${esc(s.grade)}</option>`).join('')}
        </select>
        <button class="btn btn-dark" id="exportBtn" type="button">Download JSON</button>
      </div>
    </div>

    <div class="card">
      <h3>Delete a learner <span class="helper">(right to erasure)</span></h3>
      <p class="helper" style="margin-top:4px">
        Removes the learner and all their payments, charges, attendance and message history.
        An anonymized audit row (name, grade, dates, money summary — no phone numbers or email) is
        kept first, so the books still balance. This cannot be undone.
      </p>
      <div class="toolbar" style="margin-top:10px">
        <select class="select" id="deleteSel" style="flex:1;max-width:320px">
          ${students.map(s => `<option value="${s.id}">${esc(s.name)} — Gr ${esc(s.grade)}</option>`).join('')}
        </select>
        <input class="input" id="deleteReason" placeholder="Reason (e.g. parent requested)" style="flex:1;max-width:280px" />
        <button class="btn btn-danger" id="deleteBtn" type="button">Delete learner</button>
      </div>
    </div>`;

  const exportBtn = container.querySelector('#exportBtn');
  exportBtn.addEventListener('click', async () => {
    const sid = container.querySelector('#exportSel').value;
    const s = students.find(x => x.id === sid);
    if (!s) return;
    exportBtn.disabled = true;
    try {
      const [charges, payments, attendance, messages] = await Promise.all([
        fetchAll(sb.from('charges').select('*').eq('student_id', sid).order('month')),
        fetchAll(sb.from('payments').select('*').eq('student_id', sid).order('paid_on')),
        fetchAll(sb.from('attendance').select('*').eq('student_id', sid)),
        fetchAll(sb.from('message_log').select('*').eq('student_id', sid).order('sent_on')),
      ]);
      downloadJSON(`blr-data-${s.name.replace(/\s+/g, '-').toLowerCase()}.json`, {
        exported_on: new Date().toISOString(),
        student: s,
        charges, payments, attendance, messages,
      });
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      exportBtn.disabled = false;
    }
  });

  const deleteBtn = container.querySelector('#deleteBtn');
  deleteBtn.addEventListener('click', async () => {
    const sid = container.querySelector('#deleteSel').value;
    const s = students.find(x => x.id === sid);
    if (!s) return;
    const reason = container.querySelector('#deleteReason').value.trim();
    const ok = await confirmDialog(
      `Delete ${s.name}?`,
      `All of ${s.name}'s payments, charges, attendance and messages will be permanently removed (an anonymized audit row is kept for the books).`,
      'Delete permanently', true,
    );
    if (!ok) return;
    deleteBtn.disabled = true;
    try {
      const [charges, payments] = await Promise.all([
        fetchAll(sb.from('charges').select('*').eq('student_id', sid)),
        fetchAll(sb.from('payments').select('*').eq('student_id', sid)),
      ]);
      const snapshot = {
        name: s.name,
        grade: s.grade,
        subjects: s.subjects,
        enrolled_on: s.enrolled_on,
        reason,
        money: {
          total_billed: charges.reduce((t, c) => t + Number(c.amount), 0),
          total_paid: payments.reduce((t, p) => t + Number(p.amount), 0),
        },
      };
      const { error: auditErr } = await sb.from('deleted_students').insert({ reason, snapshot });
      if (auditErr) throw auditErr;
      const { error } = await sb.from('students').delete().eq('id', sid);
      if (error) throw error;
      toast(`${s.name} deleted — audit row kept`);
      window.reloadView();
    } catch (e) {
      toast(e.message, 'err');
      deleteBtn.disabled = false;
    }
  });

  return { destroy() {} };
}
