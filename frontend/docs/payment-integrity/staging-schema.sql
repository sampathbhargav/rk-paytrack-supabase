-- STAGING ONLY. Schema metadata copied read-only; no production rows.
BEGIN;
SET LOCAL search_path=public;
CREATE SEQUENCE public.maintenance_invoice_seq AS bigint START WITH 1001;
CREATE TABLE public."customers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "customer_name" text NOT NULL,
  "phone" text,
  "email" text,
  "address" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "company_name" text
);
CREATE TABLE public."payment_promises" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid,
  "original_due_date" date,
  "amount_due" numeric DEFAULT 0,
  "amount_paid_now" numeric DEFAULT 0,
  "remaining_amount" numeric DEFAULT 0,
  "promised_date" date,
  "promise_status" text DEFAULT 'Pending'::text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "parent_promise_id" uuid,
  "rescheduled_from_date" date,
  "reschedule_reason" text
);
CREATE TABLE public."payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid,
  "payment_date" date NOT NULL,
  "amount_due" numeric DEFAULT 0,
  "amount_paid" numeric DEFAULT 0,
  "remaining_amount" numeric DEFAULT 0,
  "payment_method" text,
  "payment_type" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "due_date" date,
  "payment_status" text DEFAULT 'Active'::text,
  "void_reason" text,
  "voided_at" timestamp with time zone,
  "promise_id" uuid
);
CREATE TABLE public."customer_followups" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid,
  "deal_id" uuid,
  "maintenance_job_id" uuid,
  "followup_type" text NOT NULL,
  "contact_method" text DEFAULT 'Phone'::text NOT NULL,
  "note" text NOT NULL,
  "followup_date" date DEFAULT CURRENT_DATE NOT NULL,
  "next_followup_date" date,
  "priority" text DEFAULT 'Normal'::text NOT NULL,
  "status" text DEFAULT 'Completed'::text NOT NULL,
  "created_by_user_id" uuid,
  "created_by_email" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."maintenance_payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "maintenance_job_id" uuid,
  "customer_id" uuid,
  "payment_date" date DEFAULT CURRENT_DATE,
  "amount_paid" numeric DEFAULT 0 NOT NULL,
  "payment_method" text,
  "payment_status" text DEFAULT 'Paid'::text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "batch_id" uuid,
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."maintenance_promises" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "maintenance_job_id" uuid,
  "customer_id" uuid,
  "promised_date" date NOT NULL,
  "promised_amount" numeric DEFAULT 0 NOT NULL,
  "promise_status" text DEFAULT 'Pending'::text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."maintenance_jobs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid,
  "deal_id" uuid,
  "customer_name" text,
  "phone" text,
  "email" text,
  "address" text,
  "truck" text,
  "year" text,
  "vin" text,
  "job_title" text NOT NULL,
  "job_description" text,
  "work_status" text DEFAULT 'Open'::text,
  "labor_amount" numeric DEFAULT 0,
  "parts_amount" numeric DEFAULT 0,
  "tax_amount" numeric DEFAULT 0,
  "discount_amount" numeric DEFAULT 0,
  "total_amount" numeric DEFAULT 0,
  "start_date" date DEFAULT CURRENT_DATE,
  "completed_date" date,
  "due_date" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "invoice_no" text NOT NULL,
  "technician" text,
  "customer_type" text DEFAULT 'Maintenance Only'::text,
  "make" text,
  "model" text,
  "miles" numeric
);
CREATE TABLE public."payment_skips" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL,
  "original_due_date" date NOT NULL,
  "installment_no" integer NOT NULL,
  "amount_due" numeric(12,2) DEFAULT 0 NOT NULL,
  "moved_due_date" date,
  "moved_installment_no" integer,
  "skip_reason" text,
  "skip_status" text DEFAULT 'Active'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."maintenance_payment_batches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid,
  "customer_name" text,
  "phone" text,
  "payment_date" date NOT NULL,
  "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
  "payment_method" text DEFAULT 'Cash'::text NOT NULL,
  "notes" text,
  "receipt_no" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."deals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "deal_tag" text NOT NULL,
  "customer_id" uuid,
  "truck" text,
  "year" text,
  "vin" text,
  "total_amount" numeric DEFAULT 0,
  "monthly_payment" numeric DEFAULT 0,
  "due_day" integer,
  "term" integer,
  "maturity_date" date,
  "status" text DEFAULT 'Active'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "deal_type" text DEFAULT 'In-house'::text,
  "start_date" date,
  "deal_subtype" text,
  "notes" text,
  "referred_by_name" text,
  "referred_by_phone" text,
  "referral_money_paid" boolean DEFAULT false,
  "referral_amount_paid" numeric DEFAULT 0,
  "updated_at" timestamp with time zone,
  "payment_frequency" text DEFAULT 'Monthly'::text,
  "first_payment_date" date,
  "principal_amount" numeric(12,2),
  "second_due_day" integer
);
CREATE TABLE public."activity_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "user_email" text,
  "action" text NOT NULL,
  "module" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "entity_label" text,
  "description" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."customers" ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id);
ALTER TABLE public."deals" ADD CONSTRAINT "deals_pkey" PRIMARY KEY (id);
ALTER TABLE public."deals" ADD CONSTRAINT "deals_deal_tag_key" UNIQUE (deal_tag);
ALTER TABLE public."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY (id);
ALTER TABLE public."payment_promises" ADD CONSTRAINT "payment_promises_pkey" PRIMARY KEY (id);
ALTER TABLE public."payment_promises" ADD CONSTRAINT "payment_promises_promise_status_check" CHECK ((promise_status = ANY (ARRAY['Pending'::text, 'Broken'::text, 'Paid'::text, 'Partial Paid'::text, 'Rescheduled'::text, 'Cancelled'::text])));
ALTER TABLE public."deals" ADD CONSTRAINT "deals_status_check" CHECK ((status = ANY (ARRAY['Active'::text, 'Paid Off'::text, 'Closed'::text, 'Repo'::text, 'Cancelled'::text, 'Defaulted'::text])));
ALTER TABLE public."deals" ADD CONSTRAINT "deals_deal_type_check" CHECK ((deal_type = ANY (ARRAY['In-house'::text, 'Down Finance'::text, 'Borrow Money'::text, 'Motor Finance'::text, 'Registration Money'::text, 'Cash'::text])));
ALTER TABLE public."maintenance_jobs" ADD CONSTRAINT "maintenance_jobs_pkey" PRIMARY KEY (id);
ALTER TABLE public."maintenance_payments" ADD CONSTRAINT "maintenance_payments_pkey" PRIMARY KEY (id);
ALTER TABLE public."maintenance_promises" ADD CONSTRAINT "maintenance_promises_pkey" PRIMARY KEY (id);
ALTER TABLE public."maintenance_payment_batches" ADD CONSTRAINT "maintenance_payment_batches_pkey" PRIMARY KEY (id);
ALTER TABLE public."activity_logs" ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY (id);
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_followup_type_check" CHECK ((followup_type = ANY (ARRAY['Called customer'::text, 'Texted customer'::text, 'Customer promised payment'::text, 'Customer did not answer'::text, 'Customer disputed amount'::text, 'Manager note'::text, 'Other'::text])));
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_contact_method_check" CHECK ((contact_method = ANY (ARRAY['Phone'::text, 'Text'::text, 'Email'::text, 'In Person'::text, 'Other'::text])));
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_priority_check" CHECK ((priority = ANY (ARRAY['Low'::text, 'Normal'::text, 'High'::text])));
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_status_check" CHECK ((status = ANY (ARRAY['Open'::text, 'Completed'::text, 'Needs Follow-up'::text, 'Resolved'::text])));
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_pkey" PRIMARY KEY (id);
ALTER TABLE public."payment_skips" ADD CONSTRAINT "payment_skips_pkey" PRIMARY KEY (id);
ALTER TABLE public."deals" ADD CONSTRAINT "deals_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE public."payments" ADD CONSTRAINT "payments_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE public."payment_promises" ADD CONSTRAINT "payment_promises_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE public."payment_promises" ADD CONSTRAINT "payment_promises_parent_promise_id_fkey" FOREIGN KEY (parent_promise_id) REFERENCES payment_promises(id) ON DELETE SET NULL;
ALTER TABLE public."payments" ADD CONSTRAINT "payments_promise_id_fkey" FOREIGN KEY (promise_id) REFERENCES payment_promises(id) ON DELETE SET NULL;
ALTER TABLE public."maintenance_jobs" ADD CONSTRAINT "maintenance_jobs_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE public."maintenance_jobs" ADD CONSTRAINT "maintenance_jobs_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;
ALTER TABLE public."maintenance_payments" ADD CONSTRAINT "maintenance_payments_maintenance_job_id_fkey" FOREIGN KEY (maintenance_job_id) REFERENCES maintenance_jobs(id) ON DELETE CASCADE;
ALTER TABLE public."maintenance_payments" ADD CONSTRAINT "maintenance_payments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE public."maintenance_promises" ADD CONSTRAINT "maintenance_promises_maintenance_job_id_fkey" FOREIGN KEY (maintenance_job_id) REFERENCES maintenance_jobs(id) ON DELETE CASCADE;
ALTER TABLE public."maintenance_promises" ADD CONSTRAINT "maintenance_promises_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE public."maintenance_payment_batches" ADD CONSTRAINT "maintenance_payment_batches_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE public."maintenance_payments" ADD CONSTRAINT "maintenance_payments_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES maintenance_payment_batches(id) ON DELETE SET NULL;
ALTER TABLE public."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_maintenance_job_id_fkey" FOREIGN KEY (maintenance_job_id) REFERENCES maintenance_jobs(id) ON DELETE SET NULL;
ALTER TABLE public."customer_followups" ADD CONSTRAINT "customer_followups_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."payment_skips" ADD CONSTRAINT "payment_skips_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
CREATE INDEX payment_skips_original_due_date_idx ON public.payment_skips USING btree (original_due_date);
CREATE INDEX customer_followups_status_idx ON public.customer_followups USING btree (status);
CREATE UNIQUE INDEX maintenance_jobs_invoice_no_unique ON public.maintenance_jobs USING btree (invoice_no);
CREATE INDEX customers_company_name_idx ON public.customers USING btree (company_name);
CREATE INDEX customer_followups_next_followup_date_idx ON public.customer_followups USING btree (next_followup_date);
CREATE INDEX customer_followups_followup_date_idx ON public.customer_followups USING btree (followup_date DESC);
CREATE INDEX payment_skips_deal_id_idx ON public.payment_skips USING btree (deal_id);
CREATE INDEX activity_logs_module_idx ON public.activity_logs USING btree (module);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs USING btree (created_at DESC);
CREATE INDEX customer_followups_customer_id_idx ON public.customer_followups USING btree (customer_id);
CREATE INDEX payment_skips_status_idx ON public.payment_skips USING btree (skip_status);
CREATE INDEX activity_logs_action_idx ON public.activity_logs USING btree (action);
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_promises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customer_followups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."maintenance_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."maintenance_promises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."maintenance_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_skips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."maintenance_payment_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."activity_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to customers" ON public."customers" AS PERMISSIVE FOR ALL TO "public" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payment promises" ON public."payment_promises" AS PERMISSIVE FOR ALL TO "public" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payments" ON public."payments" AS PERMISSIVE FOR ALL TO "public" USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage customer followups" ON public."customer_followups" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete maintenance payments" ON public."maintenance_payments" AS PERMISSIVE FOR DELETE TO "anon","authenticated" USING (true);
CREATE POLICY "Allow update maintenance payments" ON public."maintenance_payments" AS PERMISSIVE FOR UPDATE TO "anon","authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert maintenance payments" ON public."maintenance_payments" AS PERMISSIVE FOR INSERT TO "anon","authenticated" WITH CHECK (true);
CREATE POLICY "Allow read maintenance payments" ON public."maintenance_payments" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true);
CREATE POLICY "Allow maintenance payments access" ON public."maintenance_payments" AS PERMISSIVE FOR ALL TO "anon","authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow maintenance promises access" ON public."maintenance_promises" AS PERMISSIVE FOR ALL TO "anon","authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow maintenance jobs access" ON public."maintenance_jobs" AS PERMISSIVE FOR ALL TO "anon","authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow payment skips delete" ON public."payment_skips" AS PERMISSIVE FOR DELETE TO "public" USING (true);
CREATE POLICY "Allow payment skips update" ON public."payment_skips" AS PERMISSIVE FOR UPDATE TO "public" USING (true) WITH CHECK (true);
CREATE POLICY "Allow payment skips insert" ON public."payment_skips" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);
CREATE POLICY "Allow payment skips select" ON public."payment_skips" AS PERMISSIVE FOR SELECT TO "public" USING (true);
CREATE POLICY "Allow delete maintenance payment batches" ON public."maintenance_payment_batches" AS PERMISSIVE FOR DELETE TO "anon","authenticated" USING (true);
CREATE POLICY "Allow update maintenance payment batches" ON public."maintenance_payment_batches" AS PERMISSIVE FOR UPDATE TO "anon","authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert maintenance payment batches" ON public."maintenance_payment_batches" AS PERMISSIVE FOR INSERT TO "anon","authenticated" WITH CHECK (true);
CREATE POLICY "Allow read maintenance payment batches" ON public."maintenance_payment_batches" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true);
CREATE POLICY "Allow all access to deals" ON public."deals" AS PERMISSIVE FOR ALL TO "public" USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can create activity logs" ON public."activity_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((auth.uid() = user_id) OR (user_id IS NULL)));
CREATE POLICY "Authenticated users can view activity logs" ON public."activity_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
GRANT INSERT ON public."customers" TO "anon";
GRANT SELECT ON public."customers" TO "anon";
GRANT UPDATE ON public."customers" TO "anon";
GRANT DELETE ON public."customers" TO "anon";
GRANT TRUNCATE ON public."customers" TO "anon";
GRANT REFERENCES ON public."customers" TO "anon";
GRANT TRIGGER ON public."customers" TO "anon";
GRANT INSERT ON public."customers" TO "authenticated";
GRANT SELECT ON public."customers" TO "authenticated";
GRANT UPDATE ON public."customers" TO "authenticated";
GRANT DELETE ON public."customers" TO "authenticated";
GRANT TRUNCATE ON public."customers" TO "authenticated";
GRANT REFERENCES ON public."customers" TO "authenticated";
GRANT TRIGGER ON public."customers" TO "authenticated";
GRANT INSERT ON public."customers" TO "service_role";
GRANT SELECT ON public."customers" TO "service_role";
GRANT UPDATE ON public."customers" TO "service_role";
GRANT DELETE ON public."customers" TO "service_role";
GRANT TRUNCATE ON public."customers" TO "service_role";
GRANT REFERENCES ON public."customers" TO "service_role";
GRANT TRIGGER ON public."customers" TO "service_role";
GRANT INSERT ON public."payment_promises" TO "anon";
GRANT SELECT ON public."payment_promises" TO "anon";
GRANT UPDATE ON public."payment_promises" TO "anon";
GRANT DELETE ON public."payment_promises" TO "anon";
GRANT TRUNCATE ON public."payment_promises" TO "anon";
GRANT REFERENCES ON public."payment_promises" TO "anon";
GRANT TRIGGER ON public."payment_promises" TO "anon";
GRANT INSERT ON public."payment_promises" TO "authenticated";
GRANT SELECT ON public."payment_promises" TO "authenticated";
GRANT UPDATE ON public."payment_promises" TO "authenticated";
GRANT DELETE ON public."payment_promises" TO "authenticated";
GRANT TRUNCATE ON public."payment_promises" TO "authenticated";
GRANT REFERENCES ON public."payment_promises" TO "authenticated";
GRANT TRIGGER ON public."payment_promises" TO "authenticated";
GRANT INSERT ON public."payment_promises" TO "service_role";
GRANT SELECT ON public."payment_promises" TO "service_role";
GRANT UPDATE ON public."payment_promises" TO "service_role";
GRANT DELETE ON public."payment_promises" TO "service_role";
GRANT TRUNCATE ON public."payment_promises" TO "service_role";
GRANT REFERENCES ON public."payment_promises" TO "service_role";
GRANT TRIGGER ON public."payment_promises" TO "service_role";
GRANT INSERT ON public."payments" TO "anon";
GRANT SELECT ON public."payments" TO "anon";
GRANT UPDATE ON public."payments" TO "anon";
GRANT DELETE ON public."payments" TO "anon";
GRANT TRUNCATE ON public."payments" TO "anon";
GRANT REFERENCES ON public."payments" TO "anon";
GRANT TRIGGER ON public."payments" TO "anon";
GRANT INSERT ON public."payments" TO "authenticated";
GRANT SELECT ON public."payments" TO "authenticated";
GRANT UPDATE ON public."payments" TO "authenticated";
GRANT DELETE ON public."payments" TO "authenticated";
GRANT TRUNCATE ON public."payments" TO "authenticated";
GRANT REFERENCES ON public."payments" TO "authenticated";
GRANT TRIGGER ON public."payments" TO "authenticated";
GRANT INSERT ON public."payments" TO "service_role";
GRANT SELECT ON public."payments" TO "service_role";
GRANT UPDATE ON public."payments" TO "service_role";
GRANT DELETE ON public."payments" TO "service_role";
GRANT TRUNCATE ON public."payments" TO "service_role";
GRANT REFERENCES ON public."payments" TO "service_role";
GRANT TRIGGER ON public."payments" TO "service_role";
GRANT INSERT ON public."customer_followups" TO "anon";
GRANT SELECT ON public."customer_followups" TO "anon";
GRANT UPDATE ON public."customer_followups" TO "anon";
GRANT DELETE ON public."customer_followups" TO "anon";
GRANT TRUNCATE ON public."customer_followups" TO "anon";
GRANT REFERENCES ON public."customer_followups" TO "anon";
GRANT TRIGGER ON public."customer_followups" TO "anon";
GRANT INSERT ON public."customer_followups" TO "authenticated";
GRANT SELECT ON public."customer_followups" TO "authenticated";
GRANT UPDATE ON public."customer_followups" TO "authenticated";
GRANT DELETE ON public."customer_followups" TO "authenticated";
GRANT TRUNCATE ON public."customer_followups" TO "authenticated";
GRANT REFERENCES ON public."customer_followups" TO "authenticated";
GRANT TRIGGER ON public."customer_followups" TO "authenticated";
GRANT INSERT ON public."customer_followups" TO "service_role";
GRANT SELECT ON public."customer_followups" TO "service_role";
GRANT UPDATE ON public."customer_followups" TO "service_role";
GRANT DELETE ON public."customer_followups" TO "service_role";
GRANT TRUNCATE ON public."customer_followups" TO "service_role";
GRANT REFERENCES ON public."customer_followups" TO "service_role";
GRANT TRIGGER ON public."customer_followups" TO "service_role";
GRANT INSERT ON public."maintenance_payments" TO "anon";
GRANT SELECT ON public."maintenance_payments" TO "anon";
GRANT UPDATE ON public."maintenance_payments" TO "anon";
GRANT DELETE ON public."maintenance_payments" TO "anon";
GRANT TRUNCATE ON public."maintenance_payments" TO "anon";
GRANT REFERENCES ON public."maintenance_payments" TO "anon";
GRANT TRIGGER ON public."maintenance_payments" TO "anon";
GRANT INSERT ON public."maintenance_payments" TO "authenticated";
GRANT SELECT ON public."maintenance_payments" TO "authenticated";
GRANT UPDATE ON public."maintenance_payments" TO "authenticated";
GRANT DELETE ON public."maintenance_payments" TO "authenticated";
GRANT TRUNCATE ON public."maintenance_payments" TO "authenticated";
GRANT REFERENCES ON public."maintenance_payments" TO "authenticated";
GRANT TRIGGER ON public."maintenance_payments" TO "authenticated";
GRANT INSERT ON public."maintenance_payments" TO "service_role";
GRANT SELECT ON public."maintenance_payments" TO "service_role";
GRANT UPDATE ON public."maintenance_payments" TO "service_role";
GRANT DELETE ON public."maintenance_payments" TO "service_role";
GRANT TRUNCATE ON public."maintenance_payments" TO "service_role";
GRANT REFERENCES ON public."maintenance_payments" TO "service_role";
GRANT TRIGGER ON public."maintenance_payments" TO "service_role";
GRANT INSERT ON public."maintenance_promises" TO "anon";
GRANT SELECT ON public."maintenance_promises" TO "anon";
GRANT UPDATE ON public."maintenance_promises" TO "anon";
GRANT DELETE ON public."maintenance_promises" TO "anon";
GRANT TRUNCATE ON public."maintenance_promises" TO "anon";
GRANT REFERENCES ON public."maintenance_promises" TO "anon";
GRANT TRIGGER ON public."maintenance_promises" TO "anon";
GRANT INSERT ON public."maintenance_promises" TO "authenticated";
GRANT SELECT ON public."maintenance_promises" TO "authenticated";
GRANT UPDATE ON public."maintenance_promises" TO "authenticated";
GRANT DELETE ON public."maintenance_promises" TO "authenticated";
GRANT TRUNCATE ON public."maintenance_promises" TO "authenticated";
GRANT REFERENCES ON public."maintenance_promises" TO "authenticated";
GRANT TRIGGER ON public."maintenance_promises" TO "authenticated";
GRANT INSERT ON public."maintenance_promises" TO "service_role";
GRANT SELECT ON public."maintenance_promises" TO "service_role";
GRANT UPDATE ON public."maintenance_promises" TO "service_role";
GRANT DELETE ON public."maintenance_promises" TO "service_role";
GRANT TRUNCATE ON public."maintenance_promises" TO "service_role";
GRANT REFERENCES ON public."maintenance_promises" TO "service_role";
GRANT TRIGGER ON public."maintenance_promises" TO "service_role";
GRANT INSERT ON public."maintenance_jobs" TO "anon";
GRANT SELECT ON public."maintenance_jobs" TO "anon";
GRANT UPDATE ON public."maintenance_jobs" TO "anon";
GRANT DELETE ON public."maintenance_jobs" TO "anon";
GRANT TRUNCATE ON public."maintenance_jobs" TO "anon";
GRANT REFERENCES ON public."maintenance_jobs" TO "anon";
GRANT TRIGGER ON public."maintenance_jobs" TO "anon";
GRANT INSERT ON public."maintenance_jobs" TO "authenticated";
GRANT SELECT ON public."maintenance_jobs" TO "authenticated";
GRANT UPDATE ON public."maintenance_jobs" TO "authenticated";
GRANT DELETE ON public."maintenance_jobs" TO "authenticated";
GRANT TRUNCATE ON public."maintenance_jobs" TO "authenticated";
GRANT REFERENCES ON public."maintenance_jobs" TO "authenticated";
GRANT TRIGGER ON public."maintenance_jobs" TO "authenticated";
GRANT INSERT ON public."maintenance_jobs" TO "service_role";
GRANT SELECT ON public."maintenance_jobs" TO "service_role";
GRANT UPDATE ON public."maintenance_jobs" TO "service_role";
GRANT DELETE ON public."maintenance_jobs" TO "service_role";
GRANT TRUNCATE ON public."maintenance_jobs" TO "service_role";
GRANT REFERENCES ON public."maintenance_jobs" TO "service_role";
GRANT TRIGGER ON public."maintenance_jobs" TO "service_role";
GRANT INSERT ON public."payment_skips" TO "anon";
GRANT SELECT ON public."payment_skips" TO "anon";
GRANT UPDATE ON public."payment_skips" TO "anon";
GRANT DELETE ON public."payment_skips" TO "anon";
GRANT TRUNCATE ON public."payment_skips" TO "anon";
GRANT REFERENCES ON public."payment_skips" TO "anon";
GRANT TRIGGER ON public."payment_skips" TO "anon";
GRANT INSERT ON public."payment_skips" TO "authenticated";
GRANT SELECT ON public."payment_skips" TO "authenticated";
GRANT UPDATE ON public."payment_skips" TO "authenticated";
GRANT DELETE ON public."payment_skips" TO "authenticated";
GRANT TRUNCATE ON public."payment_skips" TO "authenticated";
GRANT REFERENCES ON public."payment_skips" TO "authenticated";
GRANT TRIGGER ON public."payment_skips" TO "authenticated";
GRANT INSERT ON public."payment_skips" TO "service_role";
GRANT SELECT ON public."payment_skips" TO "service_role";
GRANT UPDATE ON public."payment_skips" TO "service_role";
GRANT DELETE ON public."payment_skips" TO "service_role";
GRANT TRUNCATE ON public."payment_skips" TO "service_role";
GRANT REFERENCES ON public."payment_skips" TO "service_role";
GRANT TRIGGER ON public."payment_skips" TO "service_role";
GRANT INSERT ON public."maintenance_payment_batches" TO "anon";
GRANT SELECT ON public."maintenance_payment_batches" TO "anon";
GRANT UPDATE ON public."maintenance_payment_batches" TO "anon";
GRANT DELETE ON public."maintenance_payment_batches" TO "anon";
GRANT TRUNCATE ON public."maintenance_payment_batches" TO "anon";
GRANT REFERENCES ON public."maintenance_payment_batches" TO "anon";
GRANT TRIGGER ON public."maintenance_payment_batches" TO "anon";
GRANT INSERT ON public."maintenance_payment_batches" TO "authenticated";
GRANT SELECT ON public."maintenance_payment_batches" TO "authenticated";
GRANT UPDATE ON public."maintenance_payment_batches" TO "authenticated";
GRANT DELETE ON public."maintenance_payment_batches" TO "authenticated";
GRANT TRUNCATE ON public."maintenance_payment_batches" TO "authenticated";
GRANT REFERENCES ON public."maintenance_payment_batches" TO "authenticated";
GRANT TRIGGER ON public."maintenance_payment_batches" TO "authenticated";
GRANT INSERT ON public."maintenance_payment_batches" TO "service_role";
GRANT SELECT ON public."maintenance_payment_batches" TO "service_role";
GRANT UPDATE ON public."maintenance_payment_batches" TO "service_role";
GRANT DELETE ON public."maintenance_payment_batches" TO "service_role";
GRANT TRUNCATE ON public."maintenance_payment_batches" TO "service_role";
GRANT REFERENCES ON public."maintenance_payment_batches" TO "service_role";
GRANT TRIGGER ON public."maintenance_payment_batches" TO "service_role";
GRANT INSERT ON public."deals" TO "anon";
GRANT SELECT ON public."deals" TO "anon";
GRANT UPDATE ON public."deals" TO "anon";
GRANT DELETE ON public."deals" TO "anon";
GRANT TRUNCATE ON public."deals" TO "anon";
GRANT REFERENCES ON public."deals" TO "anon";
GRANT TRIGGER ON public."deals" TO "anon";
GRANT INSERT ON public."deals" TO "authenticated";
GRANT SELECT ON public."deals" TO "authenticated";
GRANT UPDATE ON public."deals" TO "authenticated";
GRANT DELETE ON public."deals" TO "authenticated";
GRANT TRUNCATE ON public."deals" TO "authenticated";
GRANT REFERENCES ON public."deals" TO "authenticated";
GRANT TRIGGER ON public."deals" TO "authenticated";
GRANT INSERT ON public."deals" TO "service_role";
GRANT SELECT ON public."deals" TO "service_role";
GRANT UPDATE ON public."deals" TO "service_role";
GRANT DELETE ON public."deals" TO "service_role";
GRANT TRUNCATE ON public."deals" TO "service_role";
GRANT REFERENCES ON public."deals" TO "service_role";
GRANT TRIGGER ON public."deals" TO "service_role";
GRANT INSERT ON public."activity_logs" TO "anon";
GRANT SELECT ON public."activity_logs" TO "anon";
GRANT UPDATE ON public."activity_logs" TO "anon";
GRANT DELETE ON public."activity_logs" TO "anon";
GRANT TRUNCATE ON public."activity_logs" TO "anon";
GRANT REFERENCES ON public."activity_logs" TO "anon";
GRANT TRIGGER ON public."activity_logs" TO "anon";
GRANT INSERT ON public."activity_logs" TO "authenticated";
GRANT SELECT ON public."activity_logs" TO "authenticated";
GRANT UPDATE ON public."activity_logs" TO "authenticated";
GRANT DELETE ON public."activity_logs" TO "authenticated";
GRANT TRUNCATE ON public."activity_logs" TO "authenticated";
GRANT REFERENCES ON public."activity_logs" TO "authenticated";
GRANT TRIGGER ON public."activity_logs" TO "authenticated";
GRANT INSERT ON public."activity_logs" TO "service_role";
GRANT SELECT ON public."activity_logs" TO "service_role";
GRANT UPDATE ON public."activity_logs" TO "service_role";
GRANT DELETE ON public."activity_logs" TO "service_role";
GRANT TRUNCATE ON public."activity_logs" TO "service_role";
GRANT REFERENCES ON public."activity_logs" TO "service_role";
GRANT TRIGGER ON public."activity_logs" TO "service_role";
GRANT USAGE, SELECT ON SEQUENCE public.maintenance_invoice_seq TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.set_maintenance_invoice_no()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.invoice_no is null or new.invoice_no = '' then
    new.invoice_no := 'MNT-' || nextval('maintenance_invoice_seq');
  end if;

  new.total_amount :=
    greatest(
      coalesce(new.labor_amount, 0)
      + coalesce(new.parts_amount, 0)
      + coalesce(new.tax_amount, 0)
      - coalesce(new.discount_amount, 0),
      0
    );

  new.updated_at := now();

  return new;
end;
$function$
;
CREATE TRIGGER trg_set_maintenance_invoice_no BEFORE INSERT OR UPDATE ON public.maintenance_jobs FOR EACH ROW EXECUTE FUNCTION set_maintenance_invoice_no();
COMMIT;
