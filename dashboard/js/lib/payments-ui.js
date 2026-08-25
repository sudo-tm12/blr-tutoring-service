// ===== Shared "record payment" modal (used by Students, Payments, Overview) =====
// A payment may target a specific charge (the register cell it came from),
// the student's oldest unpaid charge (FIFO default), or stay unallocated
// credit — which the Payments view can later allocate to a charge.

import { sb, run, fetchAll } from '../supabase.js';
import { toast, openModal } from './ui.js';
import { esc, fmtZAR, todaySAST, fmtMonth } from './fmt.js';

export async function openRecordPaymentModal({ student, charge = null, onSaved = null }) {
  // The student's outstanding charges, oldest first (FIFO proposal).
  let statuses = [];
  try {
    statuses = await fetchAll(
      sb.from('fee_status').select('*').eq('student_id', student.id).neq('status', 'paid').order('month')
    );
  } catch (e) { console.warn(e); }

  const chargeOptions = [
    { id: '', label: 'Unallocated credit (no charge yet)' },
    ...statuses.map(s => ({
      id: s.charge_id,
      label: `${s.subject} · ${fmtMonth(monthKeyOf(s.month))} · ${fmtZAR(s.amount)} (paid ${fmtZAR(s.paid)})`,
    })),
  ];
  // If the modal was opened from a specific charge, default to it.
  const defaultId = charge ? charge.id : (chargeOptions[1] ? chargeOptions[1].id : '');

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="helper" style="margin-top:0">Payment from <strong>${esc(student.name)}</strong></p>
    <div class="form-grid">
      <label class="field full">
        <span class="label">Apply to</span>
        <select class="select" id="pm-charge">
          ${chargeOptions.map(o => `<option value="${o.id}" ${o.id === defaultId ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="label">Amount (R)</span>
        <input class="input" id="pm-amount" type="number" min="1" step="0.01" required />
      </label>
      <label class="field">
        <span class="label">Paid on</span>
        <input class="input" id="pm-date" type="date" value="${todaySAST()}" required />
      </label>
      <label class="field">
        <span class="label">Method</span>
        <select class="select" id="pm-method">
          <option value="eft">EFT</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Bank reference (as on statement)</span>
        <input class="input" id="pm-reference" placeholder="e.g. learner email" />
      </label>
      <label class="field full">
        <span class="label">Note (optional)</span>
        <input class="input" id="pm-note" />
      </label>
    </div>`;
  if (charge) {
    body.querySelector('#pm-amount').value = Math.max(0, Number(charge.amount) - Number(charge.paid));
  }

  const foot = document.createElement('div');
  foot.className = 'modal-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn btn-ghost'; cancel.textContent = 'Cancel';
  const save = document.createElement('button');
  save.type = 'button'; save.className = 'btn btn-dark'; save.textContent = 'Record payment';
  foot.append(cancel, save);

  const { el, close } = openModal({
    title: charge ? `Record payment — ${esc(student.name)}` : `Record payment`,
    body,
    footer: foot,
    size: 'sm',
  });

  cancel.addEventListener('click', close);
  save.addEventListener('click', async () => {
    const amount = parseFloat(body.querySelector('#pm-amount').value);
    if (!amount || amount <= 0) { toast('Enter an amount greater than zero', 'err'); return; }
    const chargeId = body.querySelector('#pm-charge').value || null;
    const { error } = await sb.from('payments').insert({
      student_id: student.id,
      charge_id: chargeId,
      amount,
      paid_on: body.querySelector('#pm-date').value,
      method: body.querySelector('#pm-method').value,
      reference: body.querySelector('#pm-reference').value.trim(),
      note: body.querySelector('#pm-note').value.trim(),
    });
    if (error) { toast(error.message, 'err'); return; }
    toast(`Recorded ${fmtZAR(amount)} for ${student.name}`);
    close();
    if (onSaved) await onSaved();
  });

  return { el, close };
}

// Fee month is a date like '2026-08-01' → '2026-08' for fmtMonth().
function monthKeyOf(d) {
  return String(d).slice(0, 7);
}
