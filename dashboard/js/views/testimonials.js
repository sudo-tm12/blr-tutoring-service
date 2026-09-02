// ===== Testimonials view — pending queue, approved/rejected, admin add =====
// The public site only ever reads `approved` rows (RLS). Everything else is
// managed here. Approve/reject in one click; seeds show first in Approved and
// can be unpublished as real reviews arrive (PRD §8.8).

import { sb, fetchAll } from '../supabase.js';
import { toast, confirmDialog, openModal, chip, starRow } from '../lib/ui.js';
import { esc, fmtDate } from '../lib/fmt.js';

export async function render(container) {
  let rows = [];
  let tab = 'pending';

  const load = async () => {
    try {
      rows = await fetchAll(sb.from('testimonials').select('*').order('created_at', { ascending: false }));
    } catch (e) {
      container.innerHTML = `<div class="card"><p class="empty">Couldn't load testimonials: ${esc(e.message)}</p></div>`;
      return {};
    }
    paint();
  };

  const setStatus = async (id, status) => {
    const patch = status === 'approved'
      ? { status, approved_at: new Date().toISOString() }
      : { status };
    const { error } = await sb.from('testimonials').update(patch).eq('id', id);
    if (error) { toast(error.message, 'err'); return; }
    toast(status === 'approved' ? 'Published — it reaches the site within 24h (site cache)' : 'Rejected');
    load();
  };

  const paint = () => {
    const counts = {
      pending: rows.filter(r => r.status === 'pending').length,
      approved: rows.filter(r => r.status === 'approved').length,
      rejected: rows.filter(r => r.status === 'rejected').length,
    };
    container.innerHTML = `
      <div class="view-head">
        <div>
          <h2>Testimonials</h2>
          <p class="lede">Reviews submitted on the site land here as pending. Approve to publish — the live site only shows approved reviews (cached for up to 24h).</p>
        </div>
        <div class="head-actions">
          <button class="btn btn-dark" id="addReviewBtn" type="button">+ Add review</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="pills">
          <button class="pill ${tab === 'pending' ? 'active' : ''}" data-tab="pending" type="button">Pending (${counts.pending})</button>
          <button class="pill ${tab === 'approved' ? 'active' : ''}" data-tab="approved" type="button">Approved (${counts.approved})</button>
          <button class="pill ${tab === 'rejected' ? 'active' : ''}" data-tab="rejected" type="button">Rejected (${counts.rejected})</button>
        </div>
      </div>
      <div class="card" style="padding:6px 10px">
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr>
              <th>Name</th><th>Grade · Subject</th><th>Rating</th><th>Review</th><th>Submitted</th><th class="num">Actions</th>
            </tr></thead>
            <tbody id="rowsBody"></tbody>
          </table>
        </div>
      </div>`;

    container.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => {
      tab = p.dataset.tab;
      paint();
    }));
    container.querySelector('#addReviewBtn').addEventListener('click', () => openAddReview(load));
    renderBody();
  };

  const renderBody = () => {
    let list = rows.filter(r => r.status === tab);
    if (tab === 'approved') {
      list = [...list].sort((a, b) => (b.is_seed - a.is_seed) || b.created_at.localeCompare(a.created_at));
    }
    const tbody = container.querySelector('#rowsBody');
    tbody.innerHTML = list.map(r => `
      <tr>
        <td class="strong">${esc(r.name)}${r.is_seed ? ' <span class="chip chip-neutral">Seed</span>' : ''}</td>
        <td>${esc(r.grade)} · ${esc(r.subject)}</td>
        <td>${starRow(r.rating)}</td>
        <td title="${esc(r.text)}">${esc(r.text.length > 140 ? r.text.slice(0, 140) + '…' : r.text)}</td>
        <td class="muted">${fmtDate(r.created_at)}</td>
        <td class="num"><div class="row-actions">
          ${tab === 'pending' ? `
            <button class="btn btn-dark btn-sm" data-approve="${r.id}" type="button">Approve</button>
            <button class="btn btn-ghost btn-sm" data-reject="${r.id}" type="button">Reject</button>` : ''}
          ${tab === 'approved' ? `
            <button class="btn btn-ghost btn-sm" data-unpub="${r.id}" type="button">Unpublish</button>` : ''}
          ${tab === 'rejected' ? `
            <button class="btn btn-ghost btn-sm" data-del="${r.id}" type="button">Delete</button>` : ''}
        </div></td>
      </tr>`).join('') || `<tr><td colspan="6"><p class="empty">${
        tab === 'pending' ? 'Nothing waiting for approval.' :
        tab === 'approved' ? 'No published reviews.' : 'Nothing rejected.'}</p></td></tr>`;

    tbody.querySelectorAll('[data-approve]').forEach(b =>
      b.addEventListener('click', () => setStatus(b.dataset.approve, 'approved')));
    tbody.querySelectorAll('[data-reject]').forEach(b =>
      b.addEventListener('click', () => setStatus(b.dataset.reject, 'rejected')));
    tbody.querySelectorAll('[data-unpub]').forEach(b =>
      b.addEventListener('click', async () => {
        const ok = await confirmDialog('Unpublish review', 'It moves to Rejected and disappears from the site within 24h (cache).');
        if (ok) setStatus(b.dataset.unpub, 'rejected');
      }));
    tbody.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', async () => {
        const ok = await confirmDialog('Delete review', 'Delete it permanently? This cannot be undone.', 'Delete', true);
        if (!ok) return;
        const { error } = await sb.from('testimonials').delete().eq('id', b.dataset.del);
        if (error) { toast(error.message, 'err'); return; }
        toast('Deleted');
        load();
      }));
  };

  await load();
  return { destroy() {} };
}

async function openAddReview(onSaved) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-grid">
      <label class="field"><span class="label">Name *</span><input class="input" id="rv-name" maxlength="60" /></label>
      <label class="field"><span class="label">Grade *</span>
        <select class="select" id="rv-grade">
          <option>Gr 10</option><option>Gr 11</option><option>Gr 12</option><option>University / Other</option>
        </select>
      </label>
      <label class="field"><span class="label">Subject *</span>
        <select class="select" id="rv-subject">
          <option>Mathematics</option><option>Physical Sciences</option><option>Both</option>
        </select>
      </label>
      <label class="field"><span class="label">Rating *</span>
        <select class="select" id="rv-rating">
          <option value="5">★★★★★</option><option value="4">★★★★</option>
          <option value="3">★★★</option><option value="2">★★</option><option value="1">★</option>
        </select>
      </label>
      <label class="field full"><span class="label">Review text * (20–400 chars)</span>
        <textarea class="textarea" id="rv-text" maxlength="400" style="min-height:84px"></textarea>
      </label>
    </div>
    <p class="helper">Added straight as Approved (this is Takalani's own entry, not a public submission).</p>`;
  const foot = document.createElement('div');
  foot.className = 'modal-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn btn-ghost'; cancel.textContent = 'Cancel';
  const save = document.createElement('button');
  save.type = 'button'; save.className = 'btn btn-dark'; save.textContent = 'Publish';
  foot.append(cancel, save);
  const { close } = openModal({ title: 'Add review', body, footer: foot });
  cancel.addEventListener('click', close);
  save.addEventListener('click', async () => {
    const name = body.querySelector('#rv-name').value.trim();
    const text = body.querySelector('#rv-text').value.trim();
    if (!name) { toast('Name is required', 'err'); return; }
    if (text.length < 20) { toast('Review must be at least 20 characters', 'err'); return; }
    const { error } = await sb.from('testimonials').insert({
      name,
      grade: body.querySelector('#rv-grade').value,
      subject: body.querySelector('#rv-subject').value,
      rating: +body.querySelector('#rv-rating').value,
      text,
      status: 'approved',
      source: 'admin',
      approved_at: new Date().toISOString(),
    });
    if (error) { toast(error.message, 'err'); return; }
    toast('Published');
    close();
    await onSaved();
  });
}
