// ===== Formatting + SA helpers (shared by all views) =====

// Today's date as "yyyy-mm-dd" in South Africa.
// NEVER use toISOString() for dates — it shifts to UTC and SA mornings
// would show yesterday's date (CLAUDE.md money rules).
export function todaySAST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Month key helpers: 'yyyy-mm' strings are the register's currency.
export function monthKey(d) {
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function firstOfMonth(mk) {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function addMonths(mk, n) {
  const d = firstOfMonth(mk);
  d.setMonth(d.getMonth() + n);
  return monthKey(d);
}

export function fmtMonth(mk) {
  const d = firstOfMonth(mk);
  return d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
}

// "Mar, Apr" / "Mar–May 2026" for template placeholders like {months}.
export function fmtMonths(list) {
  if (!list.length) return '';
  const sorted = [...new Set(list)].sort();
  const spans = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur && addMonths(prev, 1) === cur) { prev = cur; continue; }
    const s = fmtMonth(start), e = fmtMonth(prev);
    spans.push(s === e ? s : `${s} – ${e}`);
    start = prev = cur;
  }
  return spans.join(', ');
}

export function fmtZAR(n) {
  const v = Number(n || 0);
  return 'R' + v.toLocaleString('en-ZA', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// Normalize a SA phone number to 27XXXXXXXXX, or null if it can't be a
// valid SA mobile (07/06/08 + 8 digits). Used by students, leads, contacts.
export function normalizePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('0')) d = '27' + d.slice(1);
  return /^27[678]\d{8}$/.test(d) ? d : null;
}

export function fmtPhone(digits) {
  if (!digits) return '';
  return '+' + digits.slice(0, 2) + ' ' + digits.slice(2, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7);
}

// WhatsApp click-to-send URL (the ONLY way v1 sends messages — CLAUDE.md).
export function waLink(phoneDigits, text) {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}

// Fill {placeholders} in a template body. Only declared vars are filled;
// unknown placeholders are left visible so the owner spots the problem.
export function renderTemplate(body, values) {
  return String(body).replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? '') : m);
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function initials(name) {
  return String(name || '')
    .trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
