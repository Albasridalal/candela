-- Sample data so the portal is immediately readable after setup.
-- Dates are relative to the day you run this, so the dashboard always shows a
-- realistic mix of overdue, due-soon and delivered work.
--
-- Safe to re-run: it clears the sample rows first.

begin;

delete from public.requests;
delete from public.designers;
delete from public.work_types;

insert into public.work_types (name, sort_order) values
  ('Image', 1),
  ('Breakdown', 2),
  ('Animation', 3);

insert into public.designers (name, email) values
  ('Layla Hassan',   'layla@agency.example'),
  ('Omar Al-Najjar', 'omar@agency.example'),
  ('Mariam Saleh',   'mariam@agency.example'),
  ('Yousef Darwish', 'yousef@agency.example');

insert into public.requests
  (title, brief, work_type_id, priority, date_submitted, deadline, designer_id, status)
select
  row.title,
  row.brief,
  (select id from public.work_types where name = row.work_type),
  row.priority::public.request_priority,
  current_date + row.submitted_offset,
  current_date + row.deadline_offset,
  (select id from public.designers where name = row.designer),
  row.status::public.request_status
from (values
  ('Eid Al-Adha campaign key visual',
   'Master key visual for the Eid Al-Adha campaign, to be adapted across billboard, press and social. Arabic and English lockups, brand green palette, no stock imagery of people.',
   'Image', 'High', -14, -3, 'Layla Hassan', 'In Progress'),

  ('Q2 results infographic',
   'Single-page infographic summarising Q2 financial results for LinkedIn and the investor relations page. Figures will be supplied by Finance on approval.',
   'Breakdown', 'High', -11, -1, 'Omar Al-Najjar', 'New'),

  ('Savings account promo — motion teaser',
   '15-second vertical animation for Instagram and Snapchat promoting the new savings account profit rate. Needs an Arabic voiceover slot and an end frame with the app store badges.',
   'Animation', 'High', -6, 1, 'Layla Hassan', 'In Progress'),

  ('Auto finance product breakdown',
   'Explainer breakdown of the auto finance product: eligibility, profit rate, tenure and required documents. Customers keep asking branch staff the same four questions — this should answer them in one image.',
   'Breakdown', 'Medium', -8, 2, 'Mariam Saleh', 'In Progress'),

  ('Branch opening announcement — Salmiya',
   'Announcement post for the new Salmiya branch. Include the address line, opening date and working hours. Square and story sizes.',
   'Image', 'High', -12, -4, 'Yousef Darwish', 'Delivered'),

  ('Credit card benefits explainer',
   'Breakdown of the rewards programme tiers for the premium credit card. Cashback, airport lounge access and travel insurance.',
   'Breakdown', 'Low', -5, 9, 'Omar Al-Najjar', 'New'),

  ('ATM screen artwork refresh',
   'Refresh the idle-screen artwork across the ATM network. Six screens, 1280x1024, must stay legible at low brightness.',
   'Image', 'Low', -3, 14, null, 'New'),

  ('Youth account campaign — social kit',
   'Full social kit for the youth account launch: 4 static posts, 2 stories, 1 cover. Younger tone than the main brand line but still inside brand guidelines.',
   'Image', 'Medium', -9, 0, 'Mariam Saleh', 'In Progress'),

  ('Sustainability report — website hero',
   'Hero banner for the annual sustainability report landing page. Desktop, tablet and mobile crops.',
   'Image', 'Medium', -20, -9, 'Yousef Darwish', 'Delivered'),

  ('Mobile app update — feature walkthrough animation',
   'Short animation walking customers through the redesigned transfers flow in the mobile app. Screens will be supplied as a Figma link.',
   'Animation', 'Medium', -2, 7, 'Layla Hassan', 'New'),

  ('Ramadan working hours notice',
   'Simple bilingual notice for branch working hours during Ramadan. Social and in-branch screens.',
   'Image', 'Medium', -4, -1, 'Omar Al-Najjar', 'In Progress'),

  ('Home finance calculator — explainer breakdown',
   'Breakdown showing how the home finance calculator works, step by step, for the campaign landing page.',
   'Breakdown', 'Medium', -16, -6, 'Mariam Saleh', 'Delivered')
) as row (
  title, brief, work_type, priority, submitted_offset, deadline_offset, designer, status
);

-- The trigger stamps delivered_at with today on insert; move the delivered
-- samples back so turnaround times and "delivered this week" look real.
update public.requests set delivered_at = current_date - 5
  where title = 'Branch opening announcement — Salmiya';
update public.requests set delivered_at = current_date - 10
  where title = 'Sustainability report — website hero';
update public.requests set delivered_at = current_date - 6
  where title = 'Home finance calculator — explainer breakdown';

insert into public.request_comments (request_id, author, body, created_at)
select r.id, c.author, c.body, now() - (c.days_ago || ' days')::interval
from (values
  ('Eid Al-Adha campaign key visual', 'Account Manager',
   'Sent the brand book and last year''s Eid artwork as reference. Please keep the crescent treatment consistent with 2025.', 13),
  ('Eid Al-Adha campaign key visual', 'Layla Hassan',
   'First round is with our art director for review. Expect it by tomorrow.', 4),
  ('Eid Al-Adha campaign key visual', 'Account Manager',
   'This is now past the agreed deadline — please confirm a new delivery date today.', 1),
  ('Savings account promo — motion teaser', 'Account Manager',
   'Compliance approved the profit rate figure, you can lock the end frame.', 2),
  ('Branch opening announcement — Salmiya', 'Yousef Darwish',
   'Delivered both sizes plus a layered source file.', 5)
) as c (request_title, author, body, days_ago)
join public.requests r on r.title = c.request_title;

commit;
