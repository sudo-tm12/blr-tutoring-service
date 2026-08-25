-- ============================================================
-- BLR Tutoring — Owner Dashboard seed data
-- Run AFTER schema.sql.
--
-- Business data copied verbatim from index.html footer (banking)
-- and the site's SEED testimonials. If the site copy changes,
-- update here AND in Settings in the dashboard.
-- ============================================================

-- ---------- settings (single row) ----------

insert into settings (
  business_name, phone_primary, phone_secondary, email, address, bank,
  monthly_fee, sprint_fee, engmath_rate, clinic_free, grace_days, term_dates
) values (
  'BLR Tutoring',
  '27799424883',
  '27784742802',
  'blrtutoringservices@gmail.com',
  '342 Mogolodi Street, Sun Valley, South Africa',
  '{"bank":"Capitec","account_no":"1695 8843 19","account_type":"Savings","holder":"BLR TUTORING","branch":"BR 470010","reference":"Learner''s email"}'::jsonb,
  250, 450, 350, true, 14, '[]'::jsonb
);

-- ---------- starter message templates ----------

insert into templates (name, channel, subject, body, vars) values
(
  'Payment reminder',
  'whatsapp',
  '',
  'Hi {parent_name}! Takalani from BLR Tutoring here 👋 {student_name}''s {subject} fees for {months} ({amount}) are due {due_date}. EFT to Capitec, account 1695 8843 19, ref: your email. Thanks!',
  array['parent_name','student_name','subject','months','amount','due_date']
),
(
  'Payment reminder (email)',
  'email',
  '{student_name} — BLR Tutoring fees {months}',
  'Hi {parent_name},

This is a friendly reminder that {student_name}''s {subject} fees for {months} ({amount}) are due on {due_date}.

Banking details:
Bank: Capitec
Account holder: BLR TUTORING
Account number: 1695 8843 19 (Savings, BR 470010)
Reference: Your email address

Please send your proof of payment to blrtutoringservices@gmail.com.

Thank you,
Takalani Mugeri
BLR Tutoring',
  array['parent_name','student_name','subject','months','amount','due_date']
),
(
  'Welcome',
  'whatsapp',
  '',
  'Hi {parent_name}! Welcome to BLR Tutoring 🎉 {student_name} is booked for {subject}. First month''s fees: {amount} — EFT to Capitec, account 1695 8843 19, ref: your email. Class links come via WhatsApp before each session. — Takalani',
  array['parent_name','student_name','subject','amount']
);

-- ---------- testimonials (the site's 6 seeds, verbatim) ----------

insert into testimonials (name, grade, subject, rating, text, status, is_seed, source) values
( 'Lerato M.',  'Gr 12', 'Mathematics',       5, 'Went from failing calculus to 78% in trials. Takalani doesn''t just give you answers — he makes you understand why. Best money my parents ever spent.', 'approved', true, 'admin' ),
( 'Sipho N.',   'Gr 11', 'Physical Sciences', 5, 'The Newton''s laws class was a game changer. I always thought I just wasn''t a science person. Turns out I just needed it explained properly.', 'approved', true, 'admin' ),
( 'Amahle D.',  'Gr 10', 'Mathematics',       5, 'Joined mid-term and was nervous I''d be behind. The recordings saved me and Takalani personally messaged me to check which topics to focus on.', 'approved', true, 'admin' ),
( 'Kagiso T.',  'Gr 12', 'Physical Sciences', 5, 'R250 felt almost too good to be true, but the quality is better than a private tutor I had that charged R400 an hour. The Saturday past paper sessions are intense — in a good way.', 'approved', true, 'admin' ),
( 'Naledi P.',  'Gr 11', 'Mathematics',       4, 'WhatsApp support between classes is underrated. Got stuck on a trig proof at 9pm and had a reply with a worked example within 20 minutes.', 'approved', true, 'admin' ),
( 'Thandeka B.','Gr 10', 'Physical Sciences', 5, 'My mom was sceptical about an online tutor at first. After one term my average went from 41% to 63%. She''s the one telling my cousins to sign up now.', 'approved', true, 'admin' );
