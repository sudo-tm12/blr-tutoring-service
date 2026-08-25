// ===== send-email — Gmail SMTP over TLS, admin-only (JWT) =====
//
// The dashboard's "Send email" buttons call this via sb.functions.invoke(),
// which attaches the owner's access token. We validate it server-side with
// supabase-js (service role stays in the function's secrets, never in the
// browser). Before the app password is configured, the dashboard falls back
// to a mailto: link — see dashboard/README.md.
//
// Deploy once:
//   supabase secrets set GMAIL_USER=blrtutoringservices@gmail.com
//   supabase secrets set GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
//   supabase functions deploy send-email
//
// GMAIL_APP_PASSWORD is a 16-char app password from Google (requires
// 2-Step Verification on the Gmail account first — README has the steps).

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Function not configured' }, 500);

  const auth = req.headers.get('Authorization');
  const jwt = auth && auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return json({ error: 'Not authenticated' }, 401);

  // Validate the token server-side — anonymous callers are rejected here.
  const supabaseAdmin = createClient(url, serviceKey);
  const { data, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
  if (authErr || !data.user) return json({ error: 'Not authenticated' }, 401);

  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!gmailUser || !gmailPass) {
    return json({ error: 'Gmail app password not configured (set GMAIL_USER + GMAIL_APP_PASSWORD)' }, 500);
  }

  let payload;
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { to, subject, body } = payload || {};
  if (!to || !subject || !body) return json({ error: 'to, subject and body are required' }, 400);
  if (to.length > 254 || subject.length > 200 || body.length > 10000) return json({ error: 'Message too long' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'Invalid recipient email' }, 400);

  try {
    await sendGmail({ username: gmailUser, password: gmailPass, from: gmailUser, to, subject, body });
    return json({ sent: true });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 502);
  }
});

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Minimal SMTP client over TLS — no libraries (write the 40 lines yourself).
async function sendGmail({ username, password, from, to, subject, body }) {
  const conn = await Deno.connectTls({ hostname: 'smtp.gmail.com', port: 465 });
  const enc = new TextEncoder();
  let buf = '';

  const readLine = async () => {
    while (!buf.includes('\n')) {
      const chunk = new Uint8Array(4096);
      const n = await conn.read(chunk);
      if (n === null) throw new Error('SMTP connection closed early');
      buf += new TextDecoder().decode(chunk.subarray(0, n));
    }
    const line = buf.slice(0, buf.indexOf('\n'));
    buf = buf.slice(buf.indexOf('\n') + 1);
    return line.replace(/\r$/, '');
  };
  const send = async (line) => { await conn.write(enc.encode(line + '\r\n')); };
  const expect = (line, code) => {
    const c = Number(line.slice(0, 3));
    if (c !== code) throw new Error(`SMTP ${c}: ${line.slice(4)}`);
  };
  // btoa can't encode non-Latin1 directly — round-trip through UTF-8 bytes.
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));

  try {
    expect(await readLine(), 220);
    await send(`EHLO blrtutoring`);
    while ((await readLine()).startsWith('250-')) { /* consume capability list */ }
    await send('AUTH LOGIN');
    expect(await readLine(), 334);
    await send(b64(username));
    expect(await readLine(), 334);
    await send(b64(password));
    expect(await readLine(), 235);
    await send(`MAIL FROM:<${from}>`);
    expect(await readLine(), 250);
    await send(`RCPT TO:<${to}>`);
    expect(await readLine(), 250);
    await send('DATA');
    expect(await readLine(), 354);
    const message = [
      `From: BLR Tutoring <${from}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(body),
      '.',
    ];
    for (const l of message) await send(l);
    expect(await readLine(), 250);
    await send('QUIT');
  } finally {
    conn.close();
  }
}
