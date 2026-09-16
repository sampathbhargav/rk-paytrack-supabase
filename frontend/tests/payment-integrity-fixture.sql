-- Synthetic test database only. Never run this fixture on Supabase/production.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
  'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE public.deals (
 id uuid primary key default gen_random_uuid(), deal_tag text unique not null,
 customer_id uuid, truck text, year text, vin text, total_amount numeric default 0,
 monthly_payment numeric default 0, due_day int, term int, maturity_date date,
 status text default 'Active' CHECK(status in ('Active','Paid Off','Closed','Repo','Cancelled','Defaulted')),
 created_at timestamptz default now(), deal_type text default 'In-house',start_date date,
 deal_subtype text,notes text,referred_by_name text,referred_by_phone text,
 referral_money_paid bool default false,referral_amount_paid numeric default 0,
 updated_at timestamptz,payment_frequency text default 'Monthly',first_payment_date date,
 principal_amount numeric,second_due_day int
);
CREATE TABLE public.payment_promises (
 id uuid primary key default gen_random_uuid(),deal_id uuid references public.deals(id) on delete cascade,
 original_due_date date,amount_due numeric default 0,amount_paid_now numeric default 0,
 remaining_amount numeric default 0,promised_date date,promise_status text default 'Pending'
 CHECK(promise_status in ('Pending','Broken','Paid','Partial Paid','Rescheduled','Cancelled')),
 notes text,created_at timestamptz default now(),parent_promise_id uuid references public.payment_promises(id) on delete set null,
 rescheduled_from_date date,reschedule_reason text
);
CREATE TABLE public.payments (
 id uuid primary key default gen_random_uuid(),deal_id uuid references public.deals(id) on delete cascade,
 payment_date date not null,amount_due numeric default 0,amount_paid numeric default 0,
 remaining_amount numeric default 0,payment_method text,payment_type text,notes text,
 created_at timestamptz default now(),due_date date,payment_status text default 'Active',
 void_reason text,voided_at timestamptz,promise_id uuid references public.payment_promises(id) on delete set null
);
CREATE TABLE public.payment_skips (
 id uuid primary key default gen_random_uuid(),deal_id uuid references public.deals(id),
 original_due_date date,installment_no int,amount_due numeric,moved_due_date date,
 moved_installment_no int,skip_reason text,skip_status text,created_at timestamptz,updated_at timestamptz
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_promises ENABLE ROW LEVEL SECURITY;
CREATE POLICY existing_deals_access ON public.deals FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY existing_payments_access ON public.payments FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY existing_promises_access ON public.payment_promises FOR ALL USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.deals,public.payments,public.payment_promises TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.payment_skips TO authenticated;
