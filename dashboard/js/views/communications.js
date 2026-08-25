// ===== Communications view — templates, WhatsApp/email sends, message log =====
// v1 rule: one wa.me link per user gesture (PRD-Dashboard.md §6.4). Batch
// sending = one card per parent, one click each, everything logged.

import { sb, run, fetchAll } from '../supabase.js';
import { toast, openModal } from '../lib/ui.js';
import { esc, fmtZAR, fmtMonth, fmtMonths, monthKey, todaySAST, fmtPhone, fmtDateTime, renderTemplate } from '../lib/fmt.js';
import { openWhatsApp, sendEmail, openMailto, logMailto } from '../lib/messaging.js';

export async function render(container, params = {}) {
  let students = [], fees = [], templates = [];
  try {
    students = await fetchAll(sb.from('students').select('*').order('name'));
    fees = await fetchAll(sb.from('fee_status').select('*').eq('overdue', true).neq('status', 'paid'));
    templates = await fetchAll(sb.from('templates').select('*').order('name'));
  } catch (e) {
    container.innerHTML = `<div class="card"><p class="empty">Couldn't load: ${esc(e.message)}</p></div>`;
    return {};
  }

  const byStudent = new Map(students.map(s => [s.id, s]));

  // Pre-computed per-student reminder context (overdue charges)
  const overdueByStudent = new Map();
  for (const f of fees) {
    if (!overdueByStudent.has(f.student_id)) overdueByStudent.set(f.student_id, []);
    overdueByStudent.get(f.student_id).push(f);
  }

  const valuesFor = (s, ctx) => {
    const base = {
      parent_name: s.parent_name || 'Parent',
      student_name: s.name,
      subject: (s.subjects || []).map(x => x === 'maths' ? 'Maths' : 'Physics').join(' & ') || 'tutoring',
    };
    if (ctx === 'overdue') {
      const items = overdueByStudent.get(s.id) || [];
      const total = items.reduce((t, f) => t + Number(f.amount) - Number(f.paid), 0);
      const mks = [...new Set(items.map(f => String(f.month).slice(0, 7)))].sort();
      const subjects = [...new Set(items.map(f => f.subject))];
      return {
        ...base,
        subject: subjects.map(x => x === 'maths' ? 'Maths' : 'Physics').join(' & '),
        months: fmtMonths(mks),
        amount: fmtZAR(total),
        balance: fmtZAR(total),
        due_date: fmtMonth(mks[0]),
      };
    }
    const mk = monthKey(new Date());
    const monthFees = (overdueByStudent.get(s.id) || []).length
      ? overdueByStudent.get(s.id) : null;
    return {
      ...base,
      months: fmtMonth(mk),
      amount: fmtZAR((s.subjects || []).length * 250),
      balance: fmtZAR(monthFees ? monthFees.reduce((t, f) => t + Number(f.amount) - Number(f.paid), 0) : 0),
      due_date: fmtMonth(mk),
    };
  };

  // Default recipients: the overdue list. A "Remind" link from Payments
  // (params.remind) narrows it to just that learner.
  let recipientSource = 'overdue';
  let recipients = params.remind && byStudent.has(params.remind)
    ? [byStudent.get(params.remind)]
    : [...overdueByStudent.keys()].map(id => byStudent.get(id)).filter(Boolean);

  let selectedTemplate = templates.find(t => t.channel === 'whatsapp') || templates[0] || null;
  let manualMode = false;

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Communications</h2>
        <p class="lede">Personalized WhatsApp and email from the dashboard. Every send is logged below.</p>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="pills" id="srcPills">
          <button class="pill active" data-src="overdue" type="button">Overdue (${recipients.length})</button>
          <button class="pill" data-src="active" type="button">All active</button>
          <button class="pill" data-src="manual" type="button">Manual message</button>
        </div>
        <span class="spacer"></span>
        <select class="select" id="tplSel" aria-label="Message template">
          <option value="">Manual message</option>
          ${templates.map(t => `<option value="${t.id}" ${selectedTemplate && t.id === selectedTemplate.id ? 'selected' : ''}>${esc(t.name)} (${t.channel})</option>`).join('')}
        </select>
      </div>
      <div id="sendArea"></div>
    </div>

    <div class="card">
      <div class="view-head" style="margin-bottom:10px">
        <h3>Templates</h3>
        <button class="btn btn-dark btn-sm" id="newTplBtn" type="button">+ New template</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Name</th><th>Channel</th><th>Message</th><th class="num">Actions</th></tr></thead>
          <tbody id="tplRows">
            ${templates.map(t => `
              <tr>
                <td class="strong">${esc(t.name)}</td>
                <td><span class="chip chip-neutral">${esc(t.channel)}</span></td>
                <td class="muted">${esc((t.subject ? t.subject + ' — ' : '') + t.body.slice(0, 80))}…</td>
                <td class="num"><div class="row-actions">
                  <button class="btn btn-ghost btn-sm" data-edit="${t.id}" type="button">Edit</button>
                  <button class="btn btn-ghost btn-sm" data-del="${t.id}" type="button">Delete</button>
                </div></td>
              </tr>`).join('') || '<tr><td colspan="4"><p class="empty">No templates yet.</p></td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="helper">Placeholders: {parent_name} {student_name} {subject} {months} {amount} {due_date} {balance}</p>
    </div>

    <div class="card">
      <h3>Message log</h3>
      <div id="logArea"><p class="empty">Loading…</p></div>
    </div>`;

  const sendArea = container.querySelector('#sendArea');

  // ----- Recipient rendering -----

  function renderSendArea() {
    if (manualMode) {
      sendArea.innerHTML = `
        <div class="form-grid">
          <label class="field"><span class="label">Recipient name</span><input class="input" id="man-name" /></label>
          <label class="field"><span class="label">WhatsApp number</span><input class="input" id="man-phone" placeholder="079 123 4567" /></label>
          <label class="field full"><span class="label">Message</span><textarea class="textarea" id="man-body"></textarea></label>
        </div>
        <button class="btn btn-wa" id="man-send" type="button">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.6-.1l2.1 1c.3.1.5.2.5.3.1.1.1.8-.1 1.4z" fill="currentColor"/></svg>
          Open WhatsApp
        </button>`;
      sendArea.querySelector('#man-send').addEventListener('click', async () => {
        const phoneRaw = sendArea.querySelector('#man-phone').value.trim();
        const { normalizePhone } = await import('../lib/fmt.js');
        const phone = normalizePhone(phoneRaw);
        if (!phone) { toast('Enter a valid SA mobile number', 'err'); return; }
        const body = sendArea.querySelector('#man-body').value.trim();
        if (!body) { toast('Type the message first', 'err'); return; }
        await openWhatsApp({
          phone,
          body,
          recipient_name: sendArea.querySelector('#man-name').value.trim(),
        });
        toast('WhatsApp opened — logged');
      });
      return;
    }

    const tpl = selectedTemplate;
    const ctx = recipientSource === 'active' ? 'month' : 'overdue';
    sendArea.innerHTML = `
      ${tpl ? `<p class="helper" style="margin-top:0">Template: <strong>${esc(tpl.name)}</strong> — messages are pre-filled per parent. Edit any message before sending.</p>`
            : '<p class="helper" style="margin-top:0">No template selected — messages start blank. Pick a template above, or write each one.</p>'}
      <div id="rcCards"></div>`;

    const rcCards = sendArea.querySelector('#rcCards');
    recipients.forEach(s => {
      const vals = valuesFor(s, ctx);
      const body = tpl ? renderTemplate(tpl.body, vals) : '';
      const subject = tpl && tpl.channel === 'email' ? renderTemplate(tpl.subject, vals) : '';
      const card = document.createElement('div');
      card.className = 'card card-hover';
      card.style.marginBottom = '10px';
      card.innerHTML = `
        <div class="toolbar" style="margin-bottom:8px">
          <strong>${esc(s.name)}</strong>
          <span class="muted">${esc(s.parent_name || '')} · ${fmtPhone(s.whatsapp_override || s.parent_phone)}</span>
          <span class="spacer"></span>
          <button class="btn btn-wa btn-sm wa-send" type="button">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.6-.1l2.1 1c.3.1.5.2.5.3.1.1.1.8-.1 1.4z" fill="currentColor"/></svg>
            WhatsApp
          </button>
          ${s.email ? `<button class="btn btn-ghost btn-sm em-send" type="button">Email</button>` : ''}
        </div>
        <textarea class="textarea msg-body" style="min-height:72px">${esc(body)}</textarea>
        ${tpl && tpl.channel === 'email' ? `<div class="toolbar" style="margin-top:6px"><span class="label" style="margin:0">Subject</span><input class="input msg-subject" value="${esc(subject)}" style="flex:1" /></div>` : ''}`;
      rcCards.appendChild(card);

      const textarea = card.querySelector('.msg-body');
      const waBtn = card.querySelector('.wa-send');
      waBtn.addEventListener('click', async () => {
        const msg = textarea.value.trim() || renderTemplate(tpl.body, valuesFor(s, ctx));
        await openWhatsApp({
          phone: s.whatsapp_override || s.parent_phone,
          recipient_name: s.parent_name,
          student_id: s.id,
          template_id: tpl ? tpl.id : null,
          body: msg,
        });
        waBtn.textContent = 'Opened ✓';
        waBtn.classList.add('btn-sky');
        waBtn.classList.remove('btn-wa');
        waBtn.disabled = true;
      });
      const emBtn = card.querySelector('.em-send');
      if (emBtn) emBtn.addEventListener('click', async () => {
        const msg = textarea.value.trim() || renderTemplate(tpl.body, valuesFor(s, ctx));
        const subj = (card.querySelector('.msg-subject')?.value || tpl?.subject || 'BLR Tutoring');
        try {
          await sendEmail({
            to: s.email,
            subject: renderTemplate(subj, valuesFor(s, ctx)),
            body: msg.replace(/\n/g, '<br />'),
            student_id: s.id,
            template_id: tpl ? tpl.id : null,
          });
          toast(`Email sent to ${s.parent_name || s.email}`);
          emBtn.textContent = 'Sent ✓';
          emBtn.disabled = true;
        } catch (e) {
          console.warn(e);
          toast('Email function not set up — opened your mail app instead');
          openMailto(s.email, renderTemplate(subj, valuesFor(s, ctx)), msg);
          await logMailto({
            to: s.email,
            subject: renderTemplate(subj, valuesFor(s, ctx)),
            body: msg,
            student_id: s.id,
            template_id: tpl ? tpl.id : null,
          });
          emBtn.textContent = 'Composed ✓';
          emBtn.disabled = true;
        }
      });
    });
    if (!recipients.length) sendArea.querySelector('#rcCards').innerHTML =
      '<p class="empty">Nobody in this list — nothing overdue. Nice.</p>';
  }

  renderSendArea();

  // ----- Source pills -----

  container.querySelectorAll('#srcPills .pill').forEach(p => p.addEventListener('click', () => {
    container.querySelectorAll('#srcPills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    const src = p.dataset.src;
    if (src === 'manual') { manualMode = true; }
    else {
      manualMode = false;
      recipientSource = src;
      recipients = src === 'overdue'
        ? [...overdueByStudent.keys()].map(id => byStudent.get(id)).filter(Boolean)
        : students.filter(s => s.status === 'active');
    }
    renderSendArea();
  }));

  // ----- Template picker -----

  container.querySelector('#tplSel').addEventListener('change', e => {
    selectedTemplate = templates.find(t => t.id === e.target.value) || null;
    manualMode = !selectedTemplate;
    if (manualMode) {
      container.querySelectorAll('#srcPills .pill').forEach(x => x.classList.remove('active'));
      container.querySelector('[data-src="manual"]').classList.add('active');
    }
    renderSendArea();
  });

  // ----- Template editor -----

  function openTemplateEditor(tpl, onSaved) {
    const isEdit = !!tpl;
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-grid">
        <label class="field"><span class="label">Name</span><input class="input" id="tpl-name" value="${esc(tpl?.name || '')}" /></label>
        <label class="field"><span class="label">Channel</span>
          <select class="select" id="tpl-channel">
            ${['whatsapp', 'email'].map(c => `<option value="${c}" ${tpl?.channel === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label class="field full" id="tpl-subjWrap" ${tpl?.channel !== 'email' ? 'hidden' : ''}>
          <span class="label">Subject (email only)</span><input class="input" id="tpl-subject" value="${esc(tpl?.subject || '')}" />
        </label>
        <label class="field full"><span class="label">Body</span><textarea class="textarea" id="tpl-body">${esc(tpl?.body || '')}</textarea></label>
      </div>
      <p class="helper">Placeholders: {parent_name} {student_name} {subject} {months} {amount} {due_date} {balance}</p>`;
    body.querySelector('#tpl-channel').addEventListener('change', e => {
      body.querySelector('#tpl-subjWrap').hidden = e.target.value !== 'email';
    });
    const foot = document.createElement('div');
    foot.className = 'modal-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn btn-ghost'; cancel.textContent = 'Cancel';
    const save = document.createElement('button');
    save.type = 'button'; save.className = 'btn btn-dark'; save.textContent = 'Save template';
    foot.append(cancel, save);
    const { close } = openModal({ title: isEdit ? `Edit — ${tpl.name}` : 'New template', body, footer: foot });
    cancel.addEventListener('click', close);
    save.addEventListener('click', async () => {
      const row = {
        name: body.querySelector('#tpl-name').value.trim(),
        channel: body.querySelector('#tpl-channel').value,
        subject: body.querySelector('#tpl-subject').value.trim(),
        body: body.querySelector('#tpl-body').value,
        vars: [...body.querySelector('#tpl-body').value.matchAll(/\{(\w+)\}/g)].map(m => m[1]),
      };
      if (!row.name || !row.body) { toast('Name and body are required', 'err'); return; }
      const { error } = isEdit
        ? await sb.from('templates').update(row).eq('id', tpl.id)
        : await sb.from('templates').insert(row);
      if (error) { toast(error.message, 'err'); return; }
      toast('Template saved');
      close();
      onSaved();
    });
  }

  container.querySelector('#newTplBtn').addEventListener('click', () =>
    openTemplateEditor(null, () => location.hash = location.hash));
  container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () =>
    openTemplateEditor(templates.find(t => t.id === b.dataset.edit), () => location.hash = location.hash)));
  container.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const t = templates.find(x => x.id === b.dataset.del);
    if (!window.confirm(`Delete template "${t.name}"? Past messages keep their copy.`)) return;
    const { error } = await sb.from('templates').delete().eq('id', t.id);
    if (error) { toast(error.message, 'err'); return; }
    toast('Template deleted');
    location.hash = location.hash;
  }));

  // ----- Message log -----

  const logArea = container.querySelector('#logArea');
  const statusLabels = { link_opened: 'link opened', marked_sent: 'marked sent', sent: 'sent', failed: 'failed' };
  try {
    const logs = await fetchAll(sb.from('message_log').select('*').order('sent_on', { ascending: false }).limit(100));
    logArea.innerHTML = logs.length ? `
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>When</th><th>Channel</th><th>Who</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>
            ${logs.map(l => {
              const st = byStudent.get(l.student_id);
              return `<tr>
                <td class="muted">${fmtDateTime(l.sent_on)}</td>
                <td><span class="chip chip-neutral">${esc(l.channel)}</span></td>
                <td>${esc(l.recipient_name || l.recipient_phone)}${st ? `<br /><span class="muted">${esc(st.name)}</span>` : ''}</td>
                <td class="muted"><details><summary>${esc((l.subject ? l.subject + ' — ' : '') + l.body.slice(0, 60))}…</summary><pre style="white-space:pre-wrap;font:inherit;margin:6px 0">${esc(l.body)}</pre>${l.wa_link ? `<a href="${esc(l.wa_link)}" target="_blank" rel="noopener">Open link</a>` : ''}</details></td>
                <td><span class="chip chip-${l.status === 'sent' ? 'paid' : l.status === 'failed' ? 'overdue' : 'info'}">${statusLabels[l.status] || l.status}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">Nothing sent yet.</p>';
  } catch (e) {
    logArea.innerHTML = `<p class="empty">Couldn't load the log: ${esc(e.message)}</p>`;
  }

  return { destroy() {} };
}
