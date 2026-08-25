// ===== Students view — list, fast-add, editor, detail, year rollover =====

import { sb, run, fetchAll, rpc } from '../supabase.js';
import { toast, openModal, confirmDialog, chip } from '../lib/ui.js';
import { esc, fmtZAR, fmtDate, fmtPhone, normalizePhone, todaySAST, waLink, fmtMonth } from '../lib/fmt.js';
import { openRecordPaymentModal } from '../lib/payments-ui.js';
import { openWhatsApp } from '../lib/messaging.js';

const GRADES = ['10', '11', '12', 'uni'];
const SUBJECTS = [
  { key: 'maths', label: 'Mathematics (R250/m)' },
  { key: 'physics', label: 'Physical Sciences (R250/m)' },
];

export async function render(container, params = {}) {
  if (params.id) return renderDetail(container, params.id);
  return renderList(container);
}

// ===================== LIST =====================

async function renderList(container) {
  let students = [];
  let filters = { q: '', grade: '', status: '' };

  try {
    students = await fetchAll(sb.from('students').select('*').order('name'));
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Couldn't load students: ${esc(e.message)}</p></div>`;
    return {};
  }

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Students</h2>
        <p class="lede">Every learner on the books. Add one in seconds — fees for the current month are created automatically.</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-ghost" id="rolloverBtn" type="button">Year rollover</button>
        <button class="btn btn-dark" id="addBtn" type="button">+ Add student</button>
      </div>
    </div>
    <div class="toolbar">
      <input class="input" id="q" placeholder="Search name / parent / email…" aria-label="Search students" />
      <select class="select" id="f-grade" aria-label="Filter by grade">
        <option value="">All grades</option>
        ${GRADES.map(g => `<option value="${g}">Grade ${g}</option>`).join('')}
      </select>
      <select class="select" id="f-status" aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="left">Left</option>
      </select>
      <span class="spacer"></span>
      <span class="muted" id="count"></span>
    </div>
    <div class="card" style="padding:6px 10px">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Learner</th><th>Grade</th><th>Subjects</th><th>Parent</th><th>Status</th><th class="num">Actions</th>
          </tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </div>`;

  const rowsEl = container.querySelector('#rows');

  const applyFilters = () => {
    const q = filters.q.toLowerCase();
    const list = students.filter(s => {
      if (filters.grade && s.grade !== filters.grade) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (q) {
        const hay = `${s.name} ${s.parent_name} ${s.email || ''} ${s.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    container.querySelector('#count').textContent = `${list.length} of ${students.length}`;
    rowsEl.innerHTML = list.map(s => `
      <tr>
        <td class="strong"><a href="#/students?id=${s.id}">${esc(s.name)}</a></td>
        <td>Gr ${esc(s.grade)}</td>
        <td>${(s.subjects || []).map(x => `<span class="chip chip-neutral">${x === 'maths' ? 'Maths' : 'Physics'}</span>`).join(' ') || '<span class="muted">—</span>'}</td>
        <td>
          ${esc(s.parent_name) || '<span class="muted">—</span>'}<br />
          <span class="muted">${fmtPhone(s.parent_phone)}</span>
        </td>
        <td>${chip(s.status)}</td>
        <td class="num"><div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-wa="${s.id}" type="button" title="WhatsApp parent">WhatsApp</button>
          <button class="btn btn-ghost btn-sm" data-pay="${s.id}" type="button">Payment</button>
          <button class="btn btn-ghost btn-sm" data-edit="${s.id}" type="button">Edit</button>
        </div></td>
      </tr>`).join('') || '<tr><td colspan="6"><p class="empty">No students match. Add your first one.</p></td></tr>';

    rowsEl.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => {
      const s = students.find(x => x.id === b.dataset.wa);
      openWhatsApp({
        phone: s.whatsapp_override || s.parent_phone,
        recipient_name: s.parent_name,
        student_id: s.id,
        body: `Hi ${s.parent_name || ''}, Takalani from BLR Tutoring here — regarding ${s.name}:`,
      });
    }));
    rowsEl.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', async () => {
      const s = students.find(x => x.id === b.dataset.pay);
      await openRecordPaymentModal({ student: s, onSaved: refresh });
    }));
    rowsEl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const s = students.find(x => x.id === b.dataset.edit);
      openStudentForm(s, refresh);
    }));
  };

  const refresh = async () => {
    students = await fetchAll(sb.from('students').select('*').order('name'));
    applyFilters();
  };

  container.querySelector('#q').addEventListener('input', e => { filters.q = e.target.value; applyFilters(); });
  container.querySelector('#f-grade').addEventListener('change', e => { filters.grade = e.target.value; applyFilters(); });
  container.querySelector('#f-status').addEventListener('change', e => { filters.status = e.target.value; applyFilters(); });

  container.querySelector('#addBtn').addEventListener('click', () => openStudentForm(null, refresh));

  container.querySelector('#rolloverBtn').addEventListener('click', async () => {
    const moving = students.filter(s => s.status === 'active' && s.grade !== 'uni').length;
    const ok = await confirmDialog(
      'Year rollover',
      `Bump every active learner up a grade?<br /><br />Gr 10 → Gr 11 · Gr 11 → Gr 12 · Gr 12 → Uni<br /><br /><strong>${moving} active learner${moving === 1 ? '' : 's'}</strong> will move up. Run this in January, after finals.`,
      'Roll over',
      false,
    );
    if (!ok) return;
    let done = 0;
    for (const s of students) {
      if (s.status !== 'active') continue;
      const next = { '10': '11', '11': '12', '12': 'uni' }[s.grade];
      if (!next) continue;
      const { error } = await sb.from('students').update({ grade: next }).eq('id', s.id);
      if (error) { toast(`${s.name}: ${error.message}`, 'err'); continue; }
      done++;
    }
    toast(`Rolled ${done} learner${done === 1 ? '' : 's'} up a grade`);
    refresh();
  });

  applyFilters();
  return { destroy() {} };
}

// ===================== ADD / EDIT FORM =====================

// Exported so the Leads view can reuse it for "Convert to student".
// Resolves with the saved student's id (or null when cancelled).
export async function openStudentForm(student, onSaved) {
  const isEdit = !!student;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-grid">
      <label class="field">
        <span class="label">Learner name *</span>
        <input class="input" id="st-name" value="${esc(student?.name || '')}" />
      </label>
      <label class="field">
        <span class="label">Grade *</span>
        <select class="select" id="st-grade">
          ${GRADES.map(g => `<option value="${g}" ${student?.grade === g ? 'selected' : ''}>Grade ${g}</option>`).join('')}
        </select>
      </label>
      <div class="field full">
        <span class="label">Subjects *</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${SUBJECTS.map(s => `
            <label class="check-row" style="flex:1;min-width:200px">
              <input type="checkbox" data-sub="${s.key}" ${student?.subjects?.includes(s.key) ? 'checked' : ''} />
              <span>${s.label}</span>
            </label>`).join('')}
        </div>
      </div>
      <label class="field">
        <span class="label">Parent name</span>
        <input class="input" id="st-parent" value="${esc(student?.parent_name || '')}" />
      </label>
      <label class="field">
        <span class="label">Parent WhatsApp *</span>
        <input class="input" id="st-phone" placeholder="079 123 4567" value="${esc(student?.parent_phone || '')}" />
        <span class="helper">SA mobile — the number reminders are sent to.</span>
      </label>
      <label class="field">
        <span class="label">Learner email</span>
        <input class="input" id="st-email" type="email" value="${esc(student?.email || '')}" />
        <span class="helper">Used as the EFT reference. Siblings can share one.</span>
      </label>
      <label class="field">
        <span class="label">WhatsApp override (optional)</span>
        <input class="input" id="st-wa" placeholder="Leave blank to use parent's number" value="${esc(student?.whatsapp_override || '')}" />
      </label>
      <label class="field">
        <span class="label">Enrolled on</span>
        <input class="input" id="st-enrolled" type="date" value="${student?.enrolled_on || todaySAST()}" />
      </label>
      <label class="field">
        <span class="label">Status</span>
        <select class="select" id="st-status">
          ${['active', 'paused', 'left'].map(s => `<option value="${s}" ${student?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </label>
      <label class="field full">
        <span class="label">Notes</span>
        <textarea class="textarea" id="st-notes" style="min-height:64px">${esc(student?.notes || '')}</textarea>
      </label>
      <div class="field full">
        <span class="label">POPIA consents</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label class="check-row"><input type="checkbox" id="st-c-sms" ${student ? (student.consent_sms ? 'checked' : '') : 'checked'} /><span>SMS / WhatsApp service messages</span></label>
          <label class="check-row"><input type="checkbox" id="st-c-reviews" ${student?.consent_reviews ? 'checked' : ''} /><span>Publish review with name</span></label>
          <label class="check-row"><input type="checkbox" id="st-c-mkt" ${student?.consent_marketing ? 'checked' : ''} /><span>Marketing</span></label>
        </div>
      </div>
      ${isEdit ? '' : `
      <label class="check-row full">
        <input type="checkbox" id="st-autocharge" checked />
        <span>Charge this month's fees now (R250 per subject)</span>
      </label>`}
    </div>`;

  const foot = document.createElement('div');
  foot.className = 'modal-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn btn-ghost'; cancel.textContent = 'Cancel';
  const save = document.createElement('button');
  save.type = 'button'; save.className = 'btn btn-dark';
  save.textContent = isEdit ? 'Save changes' : 'Add student';
  foot.append(cancel, save);

  const { close } = openModal({
    title: isEdit ? `Edit — ${student.name}` : 'Add student',
    body,
    footer: foot,
    size: 'lg',
  });

  cancel.addEventListener('click', close);
  save.addEventListener('click', async () => {
    const name = body.querySelector('#st-name').value.trim();
    const phoneRaw = body.querySelector('#st-phone').value.trim();
    const waRaw = body.querySelector('#st-wa').value.trim();
    const subjects = [...body.querySelectorAll('[data-sub]:checked')].map(c => c.dataset.sub);

    if (!name) { toast('Learner name is required', 'err'); body.querySelector('#st-name').focus(); return; }
    if (!subjects.length) { toast('Pick at least one subject', 'err'); return; }
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      toast('Parent WhatsApp number doesn\'t look like a valid SA mobile', 'err');
      body.querySelector('#st-phone').classList.add('invalid');
      body.querySelector('#st-phone').focus();
      return;
    }
    let waOverride = null;
    if (waRaw) {
      waOverride = normalizePhone(waRaw);
      if (!waOverride) { toast('WhatsApp override isn\'t a valid SA mobile', 'err'); return; }
    }

    const row = {
      name,
      grade: body.querySelector('#st-grade').value,
      subjects,
      parent_name: body.querySelector('#st-parent').value.trim(),
      parent_phone: phone,
      email: body.querySelector('#st-email').value.trim() || null,
      whatsapp_override: waOverride,
      enrolled_on: body.querySelector('#st-enrolled').value,
      status: body.querySelector('#st-status').value,
      notes: body.querySelector('#st-notes').value.trim(),
      consent_sms: body.querySelector('#st-c-sms').checked,
      consent_reviews: body.querySelector('#st-c-reviews').checked,
      consent_marketing: body.querySelector('#st-c-mkt').checked,
    };

    let error;
    let savedId = isEdit ? student.id : null;
    if (isEdit) ({ error } = await sb.from('students').update(row).eq('id', student.id));
    else {
      const res = await sb.from('students').insert(row).select().single();
      error = res.error;
      savedId = res.data ? res.data.id : null;
    }
    if (error) { toast(error.message, 'err'); return; }

    // New active learners get this month's charges immediately (idempotent).
    if (!isEdit && row.status === 'active' && body.querySelector('#st-autocharge').checked) {
      try {
        const n = await rpc('generate_charges', { target_month: todaySAST().slice(0, 8) + '01' });
        if (n > 0) toast(`Charged this month (${n} charge${n === 1 ? '' : 's'} created)`);
      } catch (e) { toast('Student saved, but charge generation failed — use Payments → Generate', 'err'); }
    }
    toast(isEdit ? 'Student updated' : `${name} added`);
    close();
    if (onSaved) await onSaved();
    return savedId;
  });
}

// ===================== DETAIL =====================

async function renderDetail(container, id) {
  let student, fees, payments;
  try {
    student = await run(sb.from('students').select('*').eq('id', id).single());
    fees = await fetchAll(sb.from('fee_status').select('*').eq('student_id', id).order('month', { ascending: false }));
    payments = await fetchAll(sb.from('payments').select('*').eq('student_id', id).order('paid_on', { ascending: false }).order('created_at', { ascending: false }).limit(10));
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Student not found.</p><p class="empty"><a href="#/students">← All students</a></p></div>`;
    return {};
  }

  const subjectsLabel = (student.subjects || []).map(s => s === 'maths' ? 'Maths' : 'Physics').join(' + ') || 'None';
  const outstanding = fees.filter(f => f.status !== 'paid').reduce((t, f) => t + Number(f.amount) - Number(f.paid), 0);

  container.innerHTML = `
    <p><a href="#/students">← All students</a></p>
    <div class="view-head">
      <div>
        <h2>${esc(student.name)} <span style="font-size:14px;color:var(--ink-soft)">· Gr ${esc(student.grade)}</span> ${chip(student.status)}</h2>
        <p class="lede">Enrolled ${fmtDate(student.enrolled_on)} · ${esc(subjectsLabel)} · Outstanding ${fmtZAR(outstanding)}</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-wa" id="d-wa" type="button">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.6-.1l2.1 1c.3.1.5.2.5.3.1.1.1.8-.1 1.4z" fill="currentColor"/></svg>
          WhatsApp parent
        </button>
        <button class="btn btn-dark" id="d-pay" type="button">Record payment</button>
        <button class="btn btn-ghost" id="d-edit" type="button">Edit</button>
      </div>
    </div>

    <div class="subgrid">
      <div>
        <div class="card">
          <h3>Details</h3>
          <dl class="kv" style="margin-top:10px">
            <dt>Parent</dt><dd>${esc(student.parent_name) || '—'}</dd>
            <dt>WhatsApp</dt><dd>${fmtPhone(student.whatsapp_override || student.parent_phone)}${student.whatsapp_override ? ' <span class="muted">(override)</span>' : ''}</dd>
            <dt>Email</dt><dd>${esc(student.email) || '—'}</dd>
            <dt>Subjects</dt><dd>${esc(subjectsLabel)}</dd>
            <dt>Enrolled</dt><dd>${fmtDate(student.enrolled_on)}</dd>
            <dt>Consents</dt><dd>${student.consent_sms ? 'SMS ' : ''}${student.consent_reviews ? '· Reviews ' : ''}${student.consent_marketing ? '· Marketing' : ''}${(!student.consent_sms && !student.consent_reviews && !student.consent_marketing) ? 'None recorded' : ''}</dd>
            <dt>Notes</dt><dd>${esc(student.notes) || '—'}</dd>
          </dl>
        </div>

        <div class="card">
          <h3>Recent payments</h3>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Date</th><th class="num">Amount</th><th>Method</th><th>Reference</th></tr></thead>
              <tbody>
                ${payments.map(p => `
                  <tr>
                    <td>${fmtDate(p.paid_on)}</td>
                    <td class="num strong">${fmtZAR(p.amount)}</td>
                    <td>${esc(p.method)}</td>
                    <td class="muted">${esc(p.reference || '')}</td>
                  </tr>`).join('') || '<tr><td colspan="4"><p class="empty">No payments yet.</p></td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <h3>Fees</h3>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Month</th><th>Subject</th><th class="num">Amount</th><th class="num">Paid</th><th>Status</th></tr></thead>
              <tbody>
                ${fees.map(f => `
                  <tr>
                    <td class="strong">${fmtMonth(String(f.month).slice(0, 7))}</td>
                    <td>${esc(f.subject)}</td>
                    <td class="num">${fmtZAR(f.amount)}</td>
                    <td class="num">${fmtZAR(f.paid)}</td>
                    <td>${chip(f.status)}${f.overdue ? ' ' + chip('overdue') : ''}</td>
                  </tr>`).join('') || '<tr><td colspan="5"><p class="empty">No charges yet — generate a month from Payments.</p></td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

  const refresh = () => renderDetail(container, id);

  container.querySelector('#d-wa').addEventListener('click', () => {
    openWhatsApp({
      phone: student.whatsapp_override || student.parent_phone,
      recipient_name: student.parent_name,
      student_id: student.id,
      body: `Hi ${student.parent_name || ''}, Takalani from BLR Tutoring here — regarding ${student.name}:`,
    });
  });
  container.querySelector('#d-pay').addEventListener('click', () =>
    openRecordPaymentModal({ student, onSaved: refresh }));
  container.querySelector('#d-edit').addEventListener('click', () =>
    openStudentForm(student, refresh));

  return { destroy() {} };
}
