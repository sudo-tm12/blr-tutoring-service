// ===== Shared UI: toasts, modals, confirm =====

// ----- Toasts -----
export function toast(msg, type = 'ok') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3600);
}

// ----- Modal -----
// openModal({ title, body, footer, size }) → { el, close }
// body/footer may be strings or DOM nodes. Esc + click-outside close.
// Focus is trapped while open (CLAUDE.md §9).

let modalState = null;

function focusables(root) {
  return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.offsetParent !== null);
}

export function openModal({ title = '', body = '', footer = '', size = '' } = {}) {
  closeModal();
  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${title.replace(/"/g, '&quot;')}">
      <div class="modal-head">
        <h3>${title}</h3>
        <button class="modal-close" type="button" aria-label="Close">✕</button>
      </div>
      <div class="modal-body"></div>
      ${footer ? '<div class="modal-foot"></div>' : ''}
    </div>`;
  const modal = overlay.querySelector('.modal');
  const bodyEl = overlay.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else bodyEl.appendChild(body);
  const footEl = overlay.querySelector('.modal-foot');
  if (footEl) {
    if (typeof footer === 'string') footEl.innerHTML = footer;
    else footEl.appendChild(footer);
  }

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (modalState && modalState.restore) modalState.restore();
    modalState = null;
  };
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      const f = focusables(modal);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  overlay.querySelector('.modal-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  root.appendChild(overlay);

  modalState = { el: modal, close, restore: document.activeElement };
  const first = focusables(modal)[0];
  if (first) setTimeout(() => first.focus(), 0);
  return { el: modal, close };
}

export function closeModal() {
  if (modalState) modalState.close();
}

// ----- Confirm (destructive actions) -----
export function confirmDialog(title, message, okLabel = 'Delete', danger = true) {
  return new Promise(resolve => {
    const foot = document.createElement('div');
    foot.className = 'modal-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Cancel';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = danger ? 'btn btn-danger' : 'btn btn-dark';
    ok.textContent = okLabel;
    foot.append(cancel, ok);
    const { el, close } = openModal({
      title,
      body: `<p class="confirm-msg">${message}</p>`,
      footer: foot,
      size: 'sm',
    });
    cancel.addEventListener('click', () => { close(); resolve(false); });
    ok.addEventListener('click', () => { close(); resolve(true); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target !== cancel) { e.preventDefault(); close(); resolve(true); } });
  });
}

// ----- Helpers shared by views -----

export function chip(status) {
  return `<span class="chip chip-${status}">${status}</span>`;
}

export function starRow(rating) {
  let s = '';
  for (let i = 1; i <= 5; i++) s += `<span class="star${i <= rating ? '' : ' off'}">★</span>`;
  return `<span class="stars" aria-label="${rating} out of 5 stars">${s}</span>`;
}
