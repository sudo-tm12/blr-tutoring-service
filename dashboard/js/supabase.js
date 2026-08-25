// ===== Supabase client + shared query helpers =====
// The repo's one allowed CDN dependency (CLAUDE.md §5.6): supabase-js.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DASHBOARD_URL } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function currentSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  return sb.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return sb.auth.signOut();
}

export async function sendResetLink(email) {
  return sb.auth.resetPasswordForEmail(email, { redirectTo: DASHBOARD_URL });
}

export async function setNewPassword(password) {
  return sb.auth.updateUser({ password });
}

// Fetch ALL rows of a query (PostgREST caps a page at 1000; loop through).
export async function fetchAll(query, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

// Tiny wrapper so call sites read: await run(sb.from('students').select('*'))
export async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// PostgreSQL function call (e.g. generate_charges)
export async function rpc(fn, args = {}) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw error;
  return data;
}
