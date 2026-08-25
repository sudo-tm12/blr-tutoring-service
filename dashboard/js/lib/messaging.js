// ===== Shared messaging helpers: WhatsApp click-to-send + email + log =====
// v1 rule (PRD-Dashboard.md §6.4): one wa.me link per user gesture, never
// window.open loops — popup blockers would swallow batch sends. Every send
// is logged to message_log for the audit trail.

import { sb, run } from '../supabase.js';
import { waLink } from './fmt.js';

async function logMessage(entry) {
  try {
    await run(sb.from('message_log').insert(entry));
  } catch (e) {
    console.warn('message log insert failed:', e);
  }
}

// Opens WhatsApp in a new tab with the pre-filled message, and logs it.
export async function openWhatsApp({ phone, body, student_id = null, template_id = null, recipient_name = '' }) {
  const url = waLink(phone, body);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  await logMessage({
    student_id,
    recipient_name,
    recipient_phone: phone,
    channel: 'whatsapp',
    template_id,
    body,
    wa_link: url,
    status: 'link_opened',
  });
  return url;
}

// Sends email through the send-email Edge Function (Gmail SMTP, admin-only
// via JWT check). Throws when the function isn't deployed or fails — the
// caller falls back to mailto.
export async function sendEmail({ to, subject, body, student_id = null, template_id = null }) {
  const { error } = await sb.functions.invoke('send-email', { body: { to, subject, body } });
  if (error) throw error;
  await logMessage({
    student_id,
    recipient_name: '',
    recipient_phone: to,
    channel: 'email',
    template_id,
    subject,
    body,
    status: 'sent',
  });
}

// Log an email that was composed via mailto (we can't know it was sent,
// so the owner marks it — this records that the compose window was opened).
export async function logMailto({ to, subject, body, student_id = null, template_id = null }) {
  await logMessage({
    student_id,
    recipient_name: '',
    recipient_phone: to,
    channel: 'email',
    template_id,
    subject,
    body,
    status: 'marked_sent',
  });
}

// Compose via mailto (zero-setup fallback; works before SMTP is configured).
export function openMailto(to, subject, body) {
  const a = document.createElement('a');
  a.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  a.click();
}
