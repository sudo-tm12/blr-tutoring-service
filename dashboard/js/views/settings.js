// ===== Settings view — business info, banking, fees, term dates =====
// Fees feed generate_charges(); they snapshot into charges, so edits here
// never rewrite history (CLAUDE.md money rules).

import { sb, run, rpc } from '../supabase.js';
import { toast } from '../lib/ui.js';
import { esc, todaySAST, fmtZAR } from '../lib/fmt.js';

export async function render(container) {
  let settings;
  try {
    settings = await run(sb.from('settings').select('*').limit(1).single());
  } catch (e) {
    container.innerHTML = `
      <div class="card empty-state">
        <p class="empty">Settings row missing — run <code>dashboard/supabase/seed.sql</code> in the Supabase SQL Editor first.</p>
      </div>`;
    return {};
  }
  const bank = settings.bank || {};
  const terms = Array.isArray(settings.term_dates) ? settings.term_dates : [];

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Settings</h2>
        <p class="lede">Single source of truth for fees, banking and contact details. Changing a fee affects <em>future</em> months only.</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-dark" id="saveBtn" type="button">Save changes</button>
      </div>
    </div>

    <div class="subgrid">
      <div>
        <div class="card">
          <h3>Business &amp; banking</h3>
          <div class="form-grid" style="margin-top:12px">
            <label class="field">
              <span class="label">Business name</span>
              <input class="input" id="s-business" value="${esc(settings.business_name)}" />
            </label>
            <label class="field">
              <span class="label">Email</span>
              <input class="input" id="s-email" value="${esc(settings.email)}" />
            </label>
            <label class="field">
              <span class="label">Primary WhatsApp (27…)</span>
              <input class="input" id="s-phone1" value="${esc(settings.phone_primary)}" />
            </label>
            <label class="field">
              <span class="label">Secondary phone (27…)</span>
              <input class="input" id="s-phone2" value="${esc(settings.phone_secondary)}" />
            </label>
            <label class="field full">
              <span class="label">Address</span>
              <input class="input" id="s-address" value="${esc(settings.address)}" />
            </label>
          </div>
          <h3 style="margin-top:8px">Banking details (as on the site footer)</h3>
          <div class="form-grid" style="margin-top:12px">
            <label class="field">
              <span class="label">Bank</span>
              <input class="input" id="s-bank" value="${esc(bank.bank || '')}" />
            </label>
            <label class="field">
              <span class="label">Account number</span>
              <input class="input" id="s-account" value="${esc(bank.account_no || '')}" />
            </label>
            <label class="field">
              <span class="label">Account type</span>
              <input class="input" id="s-account-type" value="${esc(bank.account_type || '')}" />
            </label>
            <label class="field">
              <span class="label">Account holder</span>
              <input class="input" id="s-holder" value="${esc(bank.holder || '')}" />
            </label>
            <label class="field">
              <span class="label">Branch code</span>
              <input class="input" id="s-branch" value="${esc(bank.branch || '')}" />
            </label>
            <label class="field">
              <span class="label">EFT reference</span>
              <input class="input" id="s-ref" value="${esc(bank.reference || '')}" />
            </label>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <h3>Fees &amp; billing</h3>
          <div class="form-grid" style="margin-top:12px">
            <label class="field">
              <span class="label">Monthly fee per subject (R)</span>
              <input class="input" id="s-monthly" type="number" step="1" min="0" value="${settings.monthly_fee}" />
            </label>
            <label class="field">
              <span class="label">Sprint fee (R)</span>
              <input class="input" id="s-sprint" type="number" step="1" min="0" value="${settings.sprint_fee}" />
            </label>
            <label class="field">
              <span class="label">University (engmath) fee — per subject / month (R)</span>
              <input class="input" id="s-engmath" type="number" step="1" min="0" value="${settings.engmath_rate}" />
              <span class="helper">Billed monthly to Grade "uni" learners instead of the standard fee.</span>
            </label>
            <label class="field">
              <span class="label">Overdue grace days</span>
              <input class="input" id="s-grace" type="number" step="1" min="0" max="90" value="${settings.grace_days}" />
              <span class="helper">Fees become "overdue" this many days after the month ends.</span>
            </label>
            <label class="check-row full">
              <input type="checkbox" id="s-clinic" ${settings.clinic_free ? 'checked' : ''} />
              <span>Saturday clinics are free for enrolled learners</span>
            </label>
          </div>
        </div>

        <div class="card">
          <h3>School term dates <span class="helper">(reporting only — billing is calendar-month)</span></h3>
          <div id="termsList" style="margin-top:10px"></div>
          <button class="btn btn-ghost btn-sm" id="addTermBtn" type="button">+ Add term</button>
        </div>

        <div class="card">
          <h3>Billing actions</h3>
          <p class="helper" style="margin-top:0">Creates this month's charges for every active learner. Idempotent — safe to run any time.</p>
          <button class="btn btn-sky" id="genBtn" type="button">Generate charges for ${esc(new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }))}</button>
        </div>
      </div>
    </div>`;

  const termsList = container.querySelector('#termsList');
  const renderTerms = () => {
    termsList.innerHTML = '';
    terms.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'toolbar';
      row.style.marginBottom = '6px';
      row.innerHTML = `
        <input class="input" data-k="label" placeholder="Term name" value="${esc(t.label || '')}" style="width:110px" />
        <input class="input" data-k="start" type="date" value="${esc(t.start || '')}" />
        <span class="muted">→</span>
        <input class="input" data-k="end" type="date" value="${esc(t.end || '')}" />
        <button class="btn btn-ghost btn-sm" type="button" data-rm="${i}" aria-label="Remove term">✕</button>`;
      row.querySelectorAll('[data-k]').forEach(inp =>
        inp.addEventListener('input', () => { terms[i][inp.dataset.k] = inp.value; }));
      row.querySelector('[data-rm]').addEventListener('click', () => {
        terms.splice(i, 1);
        renderTerms();
      });
      termsList.appendChild(row);
    });
  };
  renderTerms();
  container.querySelector('#addTermBtn').addEventListener('click', () => {
    terms.push({ label: 'Term ' + (terms.length + 1), start: '', end: '' });
    renderTerms();
  });

  container.querySelector('#saveBtn').addEventListener('click', async () => {
    const bankJson = {
      bank: container.querySelector('#s-bank').value.trim(),
      account_no: container.querySelector('#s-account').value.trim(),
      account_type: container.querySelector('#s-account-type').value.trim(),
      holder: container.querySelector('#s-holder').value.trim(),
      branch: container.querySelector('#s-branch').value.trim(),
      reference: container.querySelector('#s-ref').value.trim(),
    };
    const cleanTerms = terms
      .filter(t => t.start && t.end)
      .map(t => ({ label: t.label, start: t.start, end: t.end }));
    const { error } = await sb.from('settings').update({
      business_name: container.querySelector('#s-business').value.trim(),
      email: container.querySelector('#s-email').value.trim(),
      phone_primary: container.querySelector('#s-phone1').value.trim(),
      phone_secondary: container.querySelector('#s-phone2').value.trim(),
      address: container.querySelector('#s-address').value.trim(),
      bank: bankJson,
      monthly_fee: Number(container.querySelector('#s-monthly').value),
      sprint_fee: Number(container.querySelector('#s-sprint').value),
      engmath_rate: Number(container.querySelector('#s-engmath').value),
      grace_days: Number(container.querySelector('#s-grace').value),
      clinic_free: container.querySelector('#s-clinic').checked,
      term_dates: cleanTerms,
    }).eq('id', true);
    if (error) { toast(error.message, 'err'); return; }
    toast('Settings saved');
  });

  container.querySelector('#genBtn').addEventListener('click', async () => {
    const n = await rpc('generate_charges', { target_month: todaySAST().slice(0, 8) + '01' });
    toast(n > 0 ? `Generated ${n} charge${n === 1 ? '' : 's'} for this month` : 'Charges for this month already exist — nothing to do');
  });

  return { destroy() {} };
}
