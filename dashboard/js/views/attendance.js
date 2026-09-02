// ===== Attendance view — sessions, tap-to-cycle register, churn flags =====
// Tap a chip to cycle present → late → absent → excused → present.
// Saved per tap. Churn = 2+ consecutive absences.

import { sb, run, fetchAll } from '../supabase.js';
import { toast, confirmDialog, openModal } from '../lib/ui.js';
import { esc, todaySAST, fmtDate } from '../lib/fmt.js';

const SLOTS = ['15:30', '16:45', '18:00'];
const CYCLE = ['present', 'late', 'absent', 'excused'];

export async function render(container) {
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'input';
  dateInput.style.width = '170px';
  dateInput.value = todaySAST();

  container.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Attendance</h2>
        <p class="lede">Register for the day. Sessions are created from the slot, subject and grade — matching learners appear as tap-to-cycle chips.</p>
      </div>
      <div class="head-actions">
        <span id="dateSlot"></span>
        <button class="btn btn-dark" id="newSessionBtn" type="button">+ New session</button>
      </div>
    </div>
    <div id="riskCard"></div>
    <div id="sessionsArea"><p class="empty">Loading…</p></div>`;

  container.querySelector('#dateSlot').appendChild(dateInput);

  const sessionsArea = container.querySelector('#sessionsArea');
  const riskCard = container.querySelector('#riskCard');

  const loadAll = async () => {
    const [sessions, students, attendance, attendanceSessions] = await Promise.all([
      run(sb.from('sessions').select('*').eq('session_date', dateInput.value).order('slot')),
      fetchAll(sb.from('students').select('*').order('name')),
      fetchAll(sb.from('attendance').select('*')),
      fetchAll(sb.from('sessions').select('id, session_date').order('session_date', { ascending: false })),
    ]);

    // Churn risk: 2+ consecutive absences (most recent sessions first)
    const sessionDates = new Map(attendanceSessions.map(s => [s.id, s.session_date]));
    const lastByStudent = new Map();
    for (const a of attendance) {
      const st = students.find(x => x.id === a.student_id);
      if (!st) continue;
      const list = lastByStudent.get(a.student_id) || [];
      list.push({ date: sessionDates.get(a.session_id), status: a.status });
      lastByStudent.set(a.student_id, list);
    }
    const atRisk = [];
    for (const [sid, list] of lastByStudent) {
      const sorted = list.filter(x => x.date).sort((a, b) => b.date.localeCompare(a.date));
      if (sorted[0] && sorted[0].status === 'absent' && (sorted[1]?.status === 'absent')) {
        const st = students.find(x => x.id === sid);
        atRisk.push(st);
      }
    }
    riskCard.innerHTML = atRisk.length ? `
      <div class="card">
        <h3>Churn watch <span class="helper">(absent from the last 2+ sessions)</span></h3>
        <div class="pills" style="margin-top:8px">
          ${atRisk.map(s => `<a class="pill" href="#/students?id=${s.id}">${esc(s.name)} · Gr ${esc(s.grade)}</a>`).join('')}
        </div>
      </div>` : '';

    if (!sessions.length) {
      sessionsArea.innerHTML = `<div class="card"><p class="empty">No sessions on ${fmtDate(dateInput.value)}. Create one — slot, subject, grade.</p></div>`;
      return;
    }

    sessionsArea.innerHTML = sessions.map(s => {
      const roster = students.filter(st =>
        st.status !== 'left' && (st.grade === s.grade || (s.grade === 'uni' && st.grade === 'uni')));
      const attMap = new Map(attendance.filter(a => a.session_id === s.id).map(a => [a.student_id, a.status]));
      const counts = { present: 0, late: 0, absent: 0, excused: 0 };
      for (const st of attMap.values()) counts[st]++;
      return `
        <div class="card" data-session="${s.id}">
          <div class="toolbar" style="margin-bottom:10px">
            <span class="chip chip-neutral">${esc(s.slot)}</span>
            <strong>${s.subject === 'maths' ? 'Maths' : s.subject === 'physics' ? 'Physical Sciences' : 'Saturday clinic'}</strong>
            <span class="muted">Gr ${esc(s.grade)} · ${s.mode === 'online' ? 'Online' : 'In person'}</span>
            <span class="spacer"></span>
            <span class="muted">${counts.present} present · ${counts.late} late · ${counts.absent} absent · ${counts.excused} excused</span>
            <button class="btn btn-ghost btn-sm" data-del="${s.id}" type="button">Delete</button>
          </div>
          <div class="att-grid">
            ${roster.map(st => {
              const cur = attMap.get(st.id) || 'present';
              return `<button class="att-chip ${cur}" data-st="${st.id}" data-ses="${s.id}" type="button">${esc(st.name)} · ${cur[0].toUpperCase()}</button>`;
            }).join('') || '<p class="empty">No learners at this grade yet.</p>'}
          </div>
        </div>`;
    }).join('');

    // Tap-to-cycle, saved per tap
    sessionsArea.querySelectorAll('.att-chip').forEach(chipEl => {
      chipEl.addEventListener('click', async () => {
        const stId = chipEl.dataset.st;
        const sesId = chipEl.dataset.ses;
        const cur = chipEl.classList.contains('present') ? 'present'
          : chipEl.classList.contains('late') ? 'late'
          : chipEl.classList.contains('absent') ? 'absent' : 'excused';
        const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
        const { error } = await sb.from('attendance').upsert(
          { session_id: sesId, student_id: stId, status: next },
          { onConflict: 'session_id,student_id' },
        );
        if (error) { toast(error.message, 'err'); return; }
        chipEl.className = 'att-chip ' + next;
        chipEl.textContent = `${chipEl.textContent.replace(/ · [PLAE]$/, '')} · ${next[0].toUpperCase()}`;
      });
    });

    sessionsArea.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const ok = await confirmDialog('Delete session', 'Delete this session and its attendance register?');
      if (!ok) return;
      const { error } = await sb.from('sessions').delete().eq('id', b.dataset.del);
      if (error) { toast(error.message, 'err'); return; }
      toast('Session deleted');
      loadAll();
    }));
  };

  dateInput.addEventListener('change', loadAll);

  // New session form
  container.querySelector('#newSessionBtn').addEventListener('click', () => {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-grid">
        <label class="field"><span class="label">Slot</span>
          <select class="select" id="se-slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select>
        </label>
        <label class="field"><span class="label">Subject</span>
          <select class="select" id="se-subject">
            <option value="maths">Maths</option>
            <option value="physics">Physical Sciences</option>
            <option value="clinic">Saturday clinic</option>
          </select>
        </label>
        <label class="field"><span class="label">Grade</span>
          <select class="select" id="se-grade">
            ${['10', '11', '12', 'uni'].map(g => `<option value="${g}">Gr ${g}</option>`).join('')}
          </select>
        </label>
        <label class="field"><span class="label">Mode</span>
          <select class="select" id="se-mode">
            <option value="online">Online</option>
            <option value="inperson">In person</option>
          </select>
        </label>
        <label class="field full"><span class="label">Note (optional)</span><input class="input" id="se-note" /></label>
      </div>`;
    const foot = document.createElement('div');
    foot.className = 'modal-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn btn-ghost'; cancel.textContent = 'Cancel';
    const create = document.createElement('button');
    create.type = 'button'; create.className = 'btn btn-dark'; create.textContent = 'Create session';
    foot.append(cancel, create);
    const { close } = openModal({
      title: `New session — ${fmtDate(dateInput.value)}`,
      body, footer: foot,
    });
    cancel.addEventListener('click', close);
    create.addEventListener('click', async () => {
      const { error } = await sb.from('sessions').insert({
        session_date: dateInput.value,
        slot: body.querySelector('#se-slot').value,
        subject: body.querySelector('#se-subject').value,
        grade: body.querySelector('#se-grade').value,
        mode: body.querySelector('#se-mode').value,
        note: body.querySelector('#se-note').value.trim(),
      });
      if (error) { toast(error.message, 'err'); return; }
      toast('Session created');
      close();
      loadAll();
    });
  });

  await loadAll();
  return { destroy() {} };
}
