-- ============================================================
-- BLR Tutoring — Owner Dashboard schema
-- Supabase (Postgres). Run this in the SQL Editor, then seed.sql.
--
-- SINGLE SOURCE OF TRUTH for the database (see CLAUDE.md §11).
-- Never edit tables by hand in the Supabase UI — change this
-- file and re-run it.
--
-- Security model:
--   - exactly ONE auth user (the owner) — authenticated role
--   - every table RLS-gated to `authenticated`
--   - testimonials: anon may INSERT (forced `pending`) and
--     SELECT (only `approved`) — the public site needs this
--   - the anon key is public by design; RLS is the gate
-- ============================================================

-- ---------- helpers ----------

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- settings (single row) ----------

create table settings (
  id             boolean primary key default true check (id),
  business_name  text not null default 'BLR Tutoring',
  phone_primary  text not null default '27799424883',
  phone_secondary text not null default '27784742802',
  email          text not null default 'blrtutoringservices@gmail.com',
  address        text not null default '342 Mogolodi Street, Sun Valley, South Africa',
  bank           jsonb not null default '{"bank":"Capitec","account_no":"1695 8843 19","account_type":"Savings","holder":"BLR TUTORING","branch":"BR 470010","reference":"Learner''s email"}'::jsonb,
  monthly_fee    numeric(10,2) not null default 250,
  sprint_fee     numeric(10,2) not null default 450,
  engmath_rate   numeric(10,2) not null default 350,
  clinic_free    boolean not null default true,
  grace_days     integer not null default 14 check (grace_days between 0 and 90),
  term_dates     jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_settings_touch before update on settings
for each row execute function touch_updated_at();

-- ---------- students ----------

create table students (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  grade             text not null check (grade in ('10','11','12','uni')),
  subjects          text[] not null default '{}'::text[] check (subjects <@ array['maths','physics']::text[]),
  parent_name       text not null default '',
  parent_phone      text not null check (parent_phone ~ '^27[678][0-9]{8}$'),
  -- nullable + NOT unique: sibling learners often share a parent email.
  -- EFT reconciliation uses the free-text reference on payments instead.
  email             text,
  whatsapp_override text check (whatsapp_override is null or whatsapp_override ~ '^27[678][0-9]{8}$'),
  status            text not null default 'active' check (status in ('active','paused','left')),
  enrolled_on       date not null default current_date,
  notes             text not null default '',
  -- POPIA consent flags
  consent_sms       boolean not null default true,
  consent_reviews   boolean not null default false,
  consent_marketing boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_students_touch before update on students
for each row execute function touch_updated_at();

-- ---------- charges (materialized fee ledger) ----------

create table charges (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject    text not null check (subject in ('maths','physics','sprint','engmath','clinic')),
  amount     numeric(10,2) not null check (amount >= 0),
  month      date not null,          -- first of month for recurring; any date for one-offs
  kind       text not null default 'recurring' check (kind in ('recurring','oneoff')),
  note       text not null default '',
  created_at timestamptz not null default now()
);

-- one recurring charge per student+subject+month → generate_charges() is idempotent.
-- one-offs (sprint, extra sessions) can repeat freely.
create unique index uq_charges_recurring
  on charges (student_id, subject, month) where kind = 'recurring';
create index ix_charges_student_month on charges (student_id, month);

-- ---------- payments ----------

create table payments (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  charge_id  uuid references charges(id) on delete set null,  -- null = unallocated credit
  amount     numeric(10,2) not null check (amount > 0),
  paid_on    date not null default current_date,
  method     text not null default 'eft' check (method in ('eft','cash','card','other')),
  reference  text not null default '',   -- free text, matches the bank statement
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index ix_payments_student on payments (student_id, paid_on);
create index ix_payments_charge on payments (charge_id);

-- ---------- fee status view (paid/partial/unpaid + overdue) ----------

create or replace view fee_status as
select
  c.id as charge_id,
  c.student_id,
  c.subject,
  c.amount,
  c.month,
  c.kind,
  c.note,
  coalesce(sum(p.amount), 0) as paid,
  case
    when coalesce(sum(p.amount), 0) >= c.amount then 'paid'
    when coalesce(sum(p.amount), 0) > 0 then 'partial'
    else 'unpaid'
  end as status,
  -- overdue = still owing AND month + 1 month + grace days has passed (SAST)
  coalesce(sum(p.amount), 0) < c.amount
    and c.month + interval '1 month'
        + (coalesce((select s.grace_days from settings s limit 1), 14) * interval '1 day')
        < ((now() at time zone 'Africa/Johannesburg')::date)::timestamp
    as overdue
from charges c
left join payments p on p.charge_id = c.id
group by c.id;

-- ---------- charge generation ----------

-- Snapshots the current monthly fee from settings into one recurring
-- charge per active student × subject. Idempotent (ON CONFLICT DO NOTHING).
-- Price changes never rewrite history — they only affect future months.
create or replace function generate_charges(target_month date)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  target_month := date_trunc('month', target_month)::date;
  if not exists (select 1 from settings) then
    raise exception 'settings row missing — run seed.sql';
  end if;
  insert into charges (student_id, subject, amount, month, kind)
  select st.id, subj,
         case when st.grade = 'uni' then s.engmath_rate else s.monthly_fee end,
         target_month, 'recurring'
  from students st
  cross join lateral unnest(st.subjects) as subj
  cross join settings s
  where st.status = 'active' and subj in ('maths','physics')
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------- sessions + attendance ----------

create table sessions (
  id           uuid primary key default gen_random_uuid(),
  session_date date not null,
  slot         text not null default '15:30',
  subject      text not null check (subject in ('maths','physics','clinic')),
  grade        text not null check (grade in ('10','11','12','uni')),
  mode         text not null default 'online' check (mode in ('online','inperson')),
  note         text not null default '',
  created_at   timestamptz not null default now(),
  unique (session_date, slot, subject, grade)
);

create table attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status     text not null default 'present' check (status in ('present','late','absent','excused')),
  note       text not null default '',
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index ix_attendance_student on attendance (student_id);

-- ---------- leads ----------

create table leads (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  phone               text not null check (phone ~ '^27[678][0-9]{8}$'),
  grade               text check (grade is null or grade in ('10','11','12','uni')),
  subject             text check (subject is null or subject in ('maths','physics','both')),
  source              text not null default 'whatsapp' check (source in ('whatsapp','tiktok','referral','website','walkin','other')),
  status              text not null default 'new' check (status in ('new','contacted','trial','enrolled','lost','closed')),
  notes               text not null default '',
  last_contact_on     date,
  converted_student_id uuid references students(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_leads_touch before update on leads
for each row execute function touch_updated_at();

create index ix_leads_status on leads (status);

-- ---------- testimonials (public site sync) ----------

create table testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  grade       text not null,
  subject     text not null,
  rating      integer not null check (rating between 1 and 5),
  text        text not null check (char_length(text) between 20 and 400),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_seed     boolean not null default false,
  source      text not null default 'website' check (source in ('website','admin')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

create index ix_testimonials_status on testimonials (status, created_at desc);

-- ---------- message templates + log ----------

create table templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  channel    text not null default 'whatsapp' check (channel in ('whatsapp','email','sms')),
  subject    text not null default '',   -- email subject; unused for whatsapp
  body       text not null,
  vars       text[] not null default '{}'::text[],  -- declared {placeholders}; renderer fills only these
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_templates_touch before update on templates
for each row execute function touch_updated_at();

create table message_log (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid references students(id) on delete set null,
  recipient_name  text not null default '',
  recipient_phone text not null default '',
  channel         text not null default 'whatsapp' check (channel in ('whatsapp','email','sms')),
  template_id     uuid references templates(id) on delete set null,
  subject         text not null default '',
  body            text not null,
  wa_link         text not null default '',  -- exact URL sent, for audit
  status          text not null default 'link_opened' check (status in ('link_opened','marked_sent','sent','failed')),
  sent_on         timestamptz not null default now()
);

create index ix_message_log_sent on message_log (sent_on desc);
create index ix_message_log_student on message_log (student_id);

-- ---------- POPIA erasure audit ----------

create table deleted_students (
  id         uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id) on delete set null,
  reason     text not null default '',
  snapshot   jsonb not null   -- the student record + financial history, kept anonymized for audit
);

-- ---------- Row Level Security ----------

-- Owner-only tables
do $$
declare t text;
begin
  foreach t in array array[
    'settings','students','charges','payments','sessions','attendance',
    'leads','templates','message_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end;
$$;

-- Testimonials: public submit (forced pending) + public read (approved only)
alter table testimonials enable row level security;
create policy "public read approved" on testimonials
  for select to anon, authenticated using (status = 'approved');
create policy "public submit pending" on testimonials
  for insert to anon, authenticated with check (status = 'pending');
create policy "owner full access" on testimonials
  for all to authenticated using (true) with check (true);

-- Append-only audit: select + insert only, nobody deletes or edits erasure records
alter table deleted_students enable row level security;
create policy "audit read" on deleted_students
  for select to authenticated using (true);
create policy "audit insert" on deleted_students
  for insert to authenticated with check (true);
