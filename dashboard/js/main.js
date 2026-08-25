// ===== Dashboard boot: auth → shell → hash router =====
// Hash routes only — GitHub Pages 404s real paths (CLAUDE.md §11).

import { currentSession, signIn, signOut, sendResetLink, setNewPassword, rpc } from './supabase.js';
import { todaySAST } from './lib/fmt.js';
import { toast } from './lib/ui.js';

const routes = {
  overview:       { title: 'Overview',        load: () => import('./views/overview.js') },
  students:       { title: 'Students',        load: () => import('./views/students.js') },
  payments:       { title: 'Payments',        load: () => import('./views/payments.js') },
  communications: { title: 'Communications',  load: () => import('./views/communications.js') },
  attendance:     { title: 'Attendance',      load: () => import('./views/attendance.js') },
  leads:          { title: 'Leads',           load: () => import('./views/leads.js') },
  testimonials:   { title: 'Testimonials',    load: () => import('./views/testimonials.js') },
  reports:        { title: 'Reports',         load: () => import('./views/reports.js') },
  settings:       { title: 'Settings',        load: () => import('./views/settings.js') },
  popia:          { title: 'POPIA',           load: () => import('./views/popia.js') },
};

const authScreen = document.getElementById('authScreen');
const appEl = document.getElementById('app');
const viewEl = document.getElementById('view');
const sideEl = document.getElementById('side');
const overlayEl = document.getElementById('sideOverlay');

let currentView = null;
let appShown = false;

// ----- Auth screens -----

function showLogin() {
  authScreen.hidden = false;
  appEl.hidden = true;
  document.getElementById('loginForm').hidden = false;
  document.getElementById('resetForm').hidden = true;
}

function showResetForm() {
  authScreen.hidden = false;
  appEl.hidden = true;
  document.getElementById('loginForm').hidden = true;
  document.getElementById('resetForm').hidden = false;
}

async function showApp() {
  if (appShown) return;
  appShown = true;
  authScreen.hidden = true;
  appEl.hidden = false;
  document.getElementById('todayLabel').textContent =
    new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  if (!location.hash) location.hash = '#/overview';
  else navigate();
  generateChargesSilently();
}

// Idempotent — the ON CONFLICT DO NOTHING in generate_charges makes this a
// cheap no-op on every visit except the first of a month (CLAUDE.md money rules).
async function generateChargesSilently() {
  try {
    const n = await rpc('generate_charges', { target_month: todaySAST().slice(0, 8) + '01' });
    if (n > 0) toast(`Generated ${n} charge${n === 1 ? '' : 's'} for this month`);
  } catch (e) {
    console.warn('auto charge generation failed:', e);
  }
}

// ----- Router -----

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [route, query = ''] = h.split('?');
  const params = Object.fromEntries(new URLSearchParams(query));
  return { route: routes[route] ? route : 'overview', params };
}

async function navigate() {
  if (!appShown) return;
  const { route, params } = parseHash();
  if (currentView && currentView.destroy) { try { currentView.destroy(); } catch (e) { console.warn(e); } }
  currentView = null;
  viewEl.innerHTML = '<div class="loading">Loading…</div>';

  let mod;
  try {
    mod = await routes[route].load();
    currentView = await mod.render(viewEl, params);
  } catch (e) {
    console.error(e);
    viewEl.innerHTML = `<div class="card empty-state"><p class="empty">Something went wrong loading this page.</p><pre class="err-box">${String(e.message || e)}</pre></div>`;
  }

  document.querySelectorAll('.side-link').forEach(a =>
    a.classList.toggle('active', a.dataset.route === route));
  document.getElementById('viewTitle').textContent = routes[route].title;
  closeDrawer();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', navigate);

// ----- Drawer (mobile ≤800px) -----

function openDrawer() {
  sideEl.classList.add('open');
  overlayEl.hidden = false;
}
function closeDrawer() {
  sideEl.classList.remove('open');
  overlayEl.hidden = true;
}
document.getElementById('menuBtn').addEventListener('click', openDrawer);
overlayEl.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sideEl.classList.contains('open')) closeDrawer();
});

// ----- Login / forgot / reset handlers -----

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.hidden = true;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const { error } = await signIn(email, password);
  if (error) {
    errEl.textContent = error.message === 'Invalid login credentials'
      ? 'Wrong email or password.' : error.message;
    errEl.hidden = false;
    return;
  }
  await showApp();
});

document.getElementById('forgotBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) { toast('Type your email first, then tap "Forgot password?"', 'err'); return; }
  const { error } = await sendResetLink(email);
  if (error) { toast(error.message, 'err'); return; }
  document.getElementById('forgotMsg').hidden = false;
});

document.getElementById('resetForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('resetError');
  errEl.hidden = true;
  const p1 = document.getElementById('resetPassword').value;
  const p2 = document.getElementById('resetPassword2').value;
  if (p1.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; errEl.hidden = false; return; }
  if (p1 !== p2) { errEl.textContent = 'Passwords don\'t match.'; errEl.hidden = false; return; }
  const { error } = await setNewPassword(p1);
  if (error) { errEl.textContent = error.message; errEl.hidden = false; return; }
  toast('Password updated');
  location.hash = '#/overview';
  await showApp();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut();
  appShown = false;
  showLogin();
  location.hash = '';
});

// ----- Boot -----

(async function boot() {
  try {
    const session = await currentSession();
    const hash = location.hash;
    const isRecovery = hash.includes('type=recovery') || hash.includes('access_token');
    if (session && isRecovery) showResetForm();
    else if (session) showApp();
    else showLogin();
  } catch (e) {
    console.error(e);
    showLogin();
  }
})();
