// Throwaway smoke check for the dashboard auth screen (run: node scraps/smoke-auth.js)
const base = 'http://127.0.0.1:8787/blr-tutoring-service/dashboard/';
const ids = [
  'authScreen', 'loginForm', 'loginEmail', 'loginPassword', 'loginError',
  'loginSubmit', 'forgotBtn', 'forgotMsg', 'resetForm', 'resetPassword',
  'resetPassword2', 'resetError', 'resetSubmit', 'backToLoginBtn',
];
(async () => {
  for (const u of ['', 'css/app.css', 'js/main.js', 'js/config.js', 'js/supabase.js',
                   'js/views/overview.js', 'js/lib/ui.js']) {
    const r = await fetch(base + u);
    console.log((u || 'index.html').padEnd(24), r.status, r.headers.get('content-type'));
  }
  const h = await (await fetch(base)).text();
  let missing = 0;
  for (const id of ids) {
    if (!h.includes(`id="${id}"`)) { console.log('MISSING ID:', id); missing++; }
  }
  for (const probe of ['auth-shell', 'auth-brand', 'auth-glyphs', 'auth-quote', 'pw-toggle',
                       'aria-pressed', 'role="alert"', 'role="status"', 'Newsreader']) {
    if (!h.includes(probe)) { console.log('MISSING MARKUP:', probe); missing++; }
  }
  const css = await (await fetch(base + 'css/app.css')).text();
  for (const probe of ['--serif', '.auth-shell', '.auth-glyphs', '.auth-quote', '.pw-toggle',
                       '.auth-error[hidden]', '100dvh', 'prefers-reduced-motion']) {
    if (!css.includes(probe)) { console.log('MISSING CSS:', probe); missing++; }
  }
  console.log(`app.css size: ${(css.length / 1024).toFixed(1)} KB (budget 40 KB raw)`);
  console.log(missing === 0 ? 'ALL CHECKS PASSED' : `${missing} CHECKS FAILED`);
})();
