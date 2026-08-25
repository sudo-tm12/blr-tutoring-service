// ===== Supabase connection (dashboard/js/config.js) =====
//
// Fill these in from your Supabase project (see dashboard/README.md §Setup):
//   Project Settings → API → Project URL + anon public key.
//
// SECURITY: only ever the anon key goes here. The anon key is public by
// design — Row Level Security in the database is the real gate. The
// service_role key must NEVER appear in any frontend file (CLAUDE.md §11).

export const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = 'PASTE_YOUR_SUPABASE_ANON_KEY';

// Directory URL of this dashboard (no hash) — used as the auth redirect target.
export const DASHBOARD_URL = new URL('.', window.location.href).href;
