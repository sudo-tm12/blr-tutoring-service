// ===== Leads view — pipeline, quick-add, convert-to-student =====

import { sb, run, fetchAll } from '../supabase.js';
import { toast, openModal, chip } from '../lib/ui.js';
import { esc, fmtPhone, normalizePhone, todaySAST, fmtDate } from '../lib/fmt.js';
import { openWhatsApp } from '../lib/messaging.js';
import { openStudentForm } from './students.js';

const STATUSES = ['new', 'contacted', 'trial', 'enrolled', 'lost', 'closed'];
const SOURCES = ['whatsapp', 'tiktok', 'referral', 'website', 'walkin', 'other'];

export async function render(container) {
  let leads = [];
  let filter = 'all';

  try {
    leads = await fetchAll(sb.from('leads').select('*').order('created_at', { ascending: false }));
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Couldn't load leads: ${esc(e.message)}</p></div>`;
    return {};
  }

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Leads</h2>
        <p class="lede">Enquiries from WhatsApp, TikTok, referrals and the site. Follow up, then convert.</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-dark" id="addLeadBtn" type="button">+ Add lead</button>
      </div>
    </div>
    <div class="toolbar">
      <div class="pills" id="statusPills">
        <button class="pill active" data-f="all" type="button">All (${leads.length})</button>
        ${STATUSES.map(st => `<button class="pill" data-f="${st}" type="button">${st} (${leads.filter(l => l.status === st).length})</button>`).join('')}
      </div>
    </div>
    <div class="card" style="padding:6px 10px">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Name</th><th>Contact</th><th>Grade</th><th>Subject</th><th>Source</th><th>Status</th><th>Last contact</th><th class="num">Actions</th>
          </tr></thead>
          <tbody id="leadRows"></tbody>
        </table>
      </div>
    </div>`;

  const rowsEl = container.querySelector('#leadRows');

  const refresh = async () => {
    leads = await fetchAll(sb.from('leads').select('*').order('created_at', { ascending: false }));
    renderRows();
  };

  const renderRows = () => {
    const list = filter === 'all' ? leads : leads.filter(l => l.status === filter);
    rowsEl.innerHTML = list.map(l => `
      <tr>
        <td class="strong">${esc(l.name)}</td>
        <td>${fmtPhone(l.phone)}<br /><a href="https://wa.me/${l.phone}" target="_blank" rel="noopener" class="muted">WhatsApp ↗</a></td>
        <td>${l.grade ? 'Gr ' + esc(l.grade) : '—'}</td>
        <td>${l.subject ? esc(l.subject === 'both' ? 'Maths & Physics' : l.subject) : '—'}</td>
        <td><span class="chip chip-neutral">${esc(l.source)}</span></td>
        <td>${chip(l.status)}</td>
        <td class="muted">${l.last_contact_on ? fmtDate(l.last_contact_on) : 'never'}</td>
        <td class="num"><div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-wa="${l.id}" type="button">WhatsApp</button>
          <button class="btn btn-ghost btn-sm" data-edit="${l.id}" type="button">Edit</button>
          ${l.status !== 'enrolled' ? `<button class="btn btn-dark btn-sm" data-convert="${l.id}" type="button">Convert</button>` : ''}
        </div></td>
      </tr>`).join('') || '<tr><td colspan="8"><p class="empty">No leads in this bucket.</p></td></tr>';

    rowsEl.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => {
      const l = leads.find(x => x.id === b.dataset.wa);
      openWhatsApp({
        phone: l.phone,
        recipient_name: l.name,
        body: `Hi ${l.name}! Takalani from BLR Tutoring here — thanks for your enquiry about ${l.subject === 'physics' ? 'Physical Sciences' : l.subject === 'both' ? 'Maths and Physical Sciences' : 'Maths'}. How can I help?`,
      });
      sb.from('leads').update({ last_contact_on: todaySAST(), status: l.status === 'new' ? 'contacted' : l.status })
        .eq('id', l.id).then(() => refresh());
    }));
    rowsEl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () =>
      openLeadForm(leads.find(x => x.id === b.dataset.edit), refresh)));
    rowsEl.querySelectorAll('[data-convert]').forEach(b => b.addEventListener('click', async () => {
      const l = leads.find(x => x.id === b.dataset.convert);
      const savedId = await openStudentForm({
        name: l.name,
        grade: l.grade || '10',
        subjects: l.subject === 'physics' ? ['physics'] : l.subject === 'both' ? ['maths', 'physics'] : ['maths'],
        parent_phone: l.phone,
        parent_name: '',
        email: null,
        whatsapp_override: null,
        enrolled_on: todaySAST(),
        status: 'active',
        notes: `Converted from ${l.source} lead.`,
        consent_sms: true,
        consent_reviews: false,
        consent_marketing: false,
      }, null);
      if (!savedId) return;
      const { error } = await sb.from('leads').update({
        status: 'enrolled',
        converted_student_id: savedId,
        last_contact_on: todaySAST(),
      }).eq('id', l.id);
      if (error) toast(error.message, 'err');
      else toast(`${l.name} is now a student`);
      refresh();
    }));
  };

  container.querySelectorAll('#statusPills .pill').forEach(p => p.addEventListener('click', () => {
    container.querySelectorAll('#statusPills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    filter = p.dataset.f;
    renderRows();
  }));

  container.querySelector('#addLeadBtn').addEventListener('click', () => openLeadForm(null, refresh));

  renderRows();
  return { destroy() {} };
}

async function openLeadForm(lead, onSaved) {
  const isEdit = !!lead;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-grid">
      <label class="field"><span class="label">Name *</span><input class="input" id="ld-name" value="${esc(lead?.name || '')}" /></label>
      <label class="field"><span class="label">WhatsApp number *</span><input class="input" id="ld-phone" placeholder="079 123 4567" value="${esc(lead?.phone || '')}" /></label>
      <label class="field"><span class="label">Grade</span>
        <select class="select" id="ld-grade">
          <option value="">Unknown</option>
          ${['10', '11', '12', 'uni'].map(g => `<option value="${g}" ${lead?.grade === g ? 'selected' : ''}>Gr ${g}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span class="label">Subject</span>
        <select class="select" id="ld-subject">
          <option value="">Unknown</option>
          <option value="maths" ${lead?.subject === 'maths' ? 'selected' : ''}>Maths</option>
          <option value="physics" ${lead?.subject === 'physics' ? 'selected' : ''}>Physical Sciences</option>
          <option value="both" ${lead?.subject === 'both' ? 'selected' : ''}>Both</option>
        </select>
      </label>
      <label class="field"><span class="label">Source</span>
        <select class="select" id="ld-source">
          ${SOURCES.map(s => `<option value="${s}" ${lead?.source === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span class="label">Status</span>
        <select class="select" id="ld-status">
          ${STATUSES.map(s => `<option value="${s}" ${lead?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </label>
      <label class="field full"><span class="label">Notes</span><textarea class="textarea" id="ld-notes" style="min-height:64px">${esc(lead?.notes || '')}</textarea></label>
    </div>`;
  const foot = document.createElement('div');
  foot.className = 'modal-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn btn-ghost'; cancel.textContent = 'Cancel';
  const save = document.createElement('button');
  save.type = 'button'; save.className = 'btn btn-dark'; save.textContent = 'Save';
  foot.append(cancel, save);
  const { close } = openModal({ title: isEdit ? `Edit — ${lead.name}` : 'Add lead', body, footer: foot });
  cancel.addEventListener('click', close);
  save.addEventListener('click', async () => {
    const name = body.querySelector('#ld-name').value.trim();
    const phone = normalizePhone(body.querySelector('#ld-phone').value.trim());
    if (!name) { toast('Name is required', 'err'); return; }
    if (!phone) { toast('Enter a valid SA mobile number', 'err'); return; }
    const row = {
      name,
      phone,
      grade: body.querySelector('#ld-grade').value || null,
      subject: body.querySelector('#ld-subject').value || null,
      source: body.querySelector('#ld-source').value,
      status: body.querySelector('#ld-status').value,
      notes: body.querySelector('#ld-notes').value.trim(),
      last_contact_on: lead?.last_contact_on || null,
    };
    const { error } = isEdit
      ? await sb.from('leads').update(row).eq('id', lead.id)
      : await sb.from('leads').insert(row);
    if (error) { toast(error.message, 'err'); return; }
    toast(isEdit ? 'Lead updated' : 'Lead added');
    close();
    if (onSaved) await onSaved();
  });
}
