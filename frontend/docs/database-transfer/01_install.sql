-- RK PayTrack: install onto ORIGINAL schema, once, as the SQL Editor administrator.
-- Do not run on the existing RK PayTrack production/staging projects: already installed.
-- No repair, customer export, historical backfill, or activation is included.
-- Pause financial writes during installation (indexes/triggers can lock tables).
-- Entire package is ONE transaction: any error rolls everything back.
BEGIN;
SET LOCAL lock_timeout = '10s';
-- Required schema checks. No customer/payment rows are read or changed.
DO $preflight$
DECLARE problems text;
BEGIN
  IF to_regnamespace('rk_payment_private') IS NOT NULL
    OR to_regprocedure('public.rk_payment_operation(uuid,text,jsonb)') IS NOT NULL
    OR to_regprocedure('public.rk_payment_capabilities()') IS NOT NULL
    OR to_regclass('public.deal_stories') IS NOT NULL
    OR to_regprocedure('public.touch_deal_story()') IS NOT NULL THEN
    RAISE EXCEPTION 'Some release objects already exist. Stop and compare installed migrations; do not drop them or rerun this installer.';
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL OR to_regprocedure('auth.jwt()') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    RAISE EXCEPTION 'This installer requires a Supabase database with Auth roles and functions.';
  END IF;
  SELECT string_agg(e.table_name||'.'||e.column_name||' expected '||e.type_name, ', ')
  INTO problems FROM (VALUES
    ('deals','id','uuid'),
    ('deals','status','text'),
    ('deals','total_amount','numeric'),
    ('deals','monthly_payment','numeric'),
    ('deals','start_date','date'),
    ('deals','due_day','int4'),
    ('deals','term','int4'),
    ('deals','deal_type','text'),
    ('deals','payment_frequency','text'),
    ('deals','first_payment_date','date'),
    ('deals','second_due_day','int4'),
    ('payments','id','uuid'),
    ('payments','deal_id','uuid'),
    ('payments','promise_id','uuid'),
    ('payments','payment_date','date'),
    ('payments','due_date','date'),
    ('payments','amount_due','numeric'),
    ('payments','amount_paid','numeric'),
    ('payments','remaining_amount','numeric'),
    ('payments','payment_method','text'),
    ('payments','payment_type','text'),
    ('payments','payment_status','text'),
    ('payments','notes','text'),
    ('payments','void_reason','text'),
    ('payments','voided_at','timestamptz'),
    ('payment_promises','id','uuid'),
    ('payment_promises','deal_id','uuid'),
    ('payment_promises','original_due_date','date'),
    ('payment_promises','amount_due','numeric'),
    ('payment_promises','amount_paid_now','numeric'),
    ('payment_promises','remaining_amount','numeric'),
    ('payment_promises','promised_date','date'),
    ('payment_promises','promise_status','text'),
    ('payment_promises','notes','text'),
    ('payment_promises','parent_promise_id','uuid'),
    ('payment_promises','rescheduled_from_date','date'),
    ('payment_promises','reschedule_reason','text'),
    ('payment_skips','id','uuid'),
    ('payment_skips','deal_id','uuid'),
    ('payment_skips','original_due_date','date'),
    ('payment_skips','installment_no','int4'),
    ('payment_skips','amount_due','numeric'),
    ('payment_skips','moved_due_date','date'),
    ('payment_skips','skip_status','text')
  ) e(table_name,column_name,type_name)
  LEFT JOIN information_schema.columns c ON c.table_schema='public'
    AND c.table_name=e.table_name AND c.column_name=e.column_name
  WHERE c.column_name IS NULL OR NOT (c.udt_name=e.type_name
    OR (e.type_name='text' AND c.udt_name='varchar'));
  IF problems IS NOT NULL THEN RAISE EXCEPTION 'Required schema mismatch: %', problems; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('deals','payments','payment_promises','payment_skips')
    AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'An existing financial table has RLS disabled. Review target security before installation.';
  END IF;
END;
$preflight$;

-- Atomic RPC, disabled by default.
CREATE SCHEMA rk_payment_private;
REVOKE ALL ON SCHEMA rk_payment_private FROM PUBLIC;
GRANT USAGE ON SCHEMA rk_payment_private TO authenticated;

-- One key per entire user operation, including all split allocations.
-- Kept outside the exposed public API schema. Never expire successful keys.
CREATE TABLE rk_payment_private.operations (
  actor_id uuid NOT NULL,
  request_id uuid NOT NULL,
  operation text NOT NULL,
  payload jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, request_id)
);
ALTER TABLE rk_payment_private.operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_operation_read ON rk_payment_private.operations
  FOR SELECT TO authenticated USING (actor_id = (select auth.uid()));
CREATE POLICY own_operation_insert ON rk_payment_private.operations
  FOR INSERT TO authenticated WITH CHECK (actor_id = (select auth.uid()));
GRANT SELECT, INSERT ON rk_payment_private.operations TO authenticated;

-- Frozen only when a valid operation first touches an installment. No backfill.
CREATE TABLE rk_payment_private.obligations (
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  due_date date NOT NULL,
  amount_due numeric NOT NULL CHECK (amount_due>0 AND amount_due=round(amount_due,2)
    AND amount_due::text NOT IN ('NaN','Infinity','-Infinity')),
  PRIMARY KEY(deal_id,due_date)
);
ALTER TABLE rk_payment_private.obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY obligation_read ON rk_payment_private.obligations FOR SELECT TO authenticated
  USING(EXISTS(SELECT 1 FROM public.deals d WHERE d.id=deal_id));
CREATE POLICY obligation_insert ON rk_payment_private.obligations FOR INSERT TO authenticated
  WITH CHECK(EXISTS(SELECT 1 FROM public.deals d WHERE d.id=deal_id));
GRANT SELECT,INSERT ON rk_payment_private.obligations TO authenticated;

CREATE TABLE rk_payment_private.configuration (
  id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false
);
INSERT INTO rk_payment_private.configuration(id,enabled) VALUES(true,false);
ALTER TABLE rk_payment_private.configuration ENABLE ROW LEVEL SECURITY;
CREATE POLICY configuration_read ON rk_payment_private.configuration FOR SELECT USING(true);
GRANT USAGE ON SCHEMA rk_payment_private TO anon;
GRANT SELECT ON rk_payment_private.configuration TO anon,authenticated;

-- This is an API write-protocol guard, not a replacement for authorization/RLS.
-- PostgREST clients cannot set this transaction-local context directly.
CREATE FUNCTION rk_payment_private.guard_writes() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF (SELECT enabled FROM rk_payment_private.configuration WHERE id)
    AND current_setting('rk.payment_operation',true) IS DISTINCT FROM 'v1' THEN
    RAISE EXCEPTION 'Payment writes require the current application version';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rk_payment_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION rk_payment_private.guard_writes();
CREATE TRIGGER rk_promise_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.payment_promises
  FOR EACH ROW EXECUTE FUNCTION rk_payment_private.guard_writes();

-- Freeze schedule-affecting edits once an obligation is captured. Serialize skips
-- with payment operations; reject changes to a captured schedule rather than drift.
CREATE FUNCTION rk_payment_private.guard_schedule() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target uuid; affected_dates date[]:='{}';
BEGIN
  IF NOT (SELECT enabled FROM rk_payment_private.configuration WHERE id) THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME='deals' THEN
    target:=OLD.id;
    IF TG_OP='UPDATE' AND
      (to_jsonb(NEW)-ARRAY['updated_at','notes','truck','year','vin','deal_tag','referred_by_name','referred_by_phone','referral_money_paid','referral_amount_paid','status'])
      IS NOT DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['updated_at','notes','truck','year','vin','deal_tag','referred_by_name','referred_by_phone','referral_money_paid','referral_amount_paid','status']) THEN
      -- Payment-derived status changes use the transaction protocol.
      IF NEW.status IS DISTINCT FROM OLD.status AND
        (NEW.status='Paid Off' OR OLD.status='Paid Off') AND
        current_setting('rk.payment_operation',true) IS DISTINCT FROM 'v1' THEN
        RAISE EXCEPTION 'Paid-off status is managed by payment operations';
      END IF;
      RETURN NEW;
    END IF;
  ELSE
    target:=CASE WHEN TG_OP='DELETE' THEN OLD.deal_id ELSE NEW.deal_id END;
    IF TG_OP='UPDATE' AND NEW.deal_id IS DISTINCT FROM OLD.deal_id THEN
      RAISE EXCEPTION 'Cannot move a payment skip between deals';
    END IF;
    PERFORM id FROM public.deals WHERE id=target FOR UPDATE;
    IF TG_OP<>'DELETE' THEN affected_dates:=ARRAY[NEW.original_due_date,NEW.moved_due_date]; END IF;
    IF TG_OP<>'INSERT' THEN affected_dates:=affected_dates||ARRAY[OLD.original_due_date,OLD.moved_due_date]; END IF;
    IF EXISTS(SELECT 1 FROM rk_payment_private.obligations o WHERE o.deal_id=target
      AND o.due_date=ANY(affected_dates)) THEN
      RAISE EXCEPTION 'Cannot move or cancel a captured installment';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF EXISTS(SELECT 1 FROM rk_payment_private.obligations WHERE deal_id=target) THEN
    RAISE EXCEPTION 'Captured payment schedule cannot be changed by this workflow';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rk_deal_schedule_guard BEFORE UPDATE OR DELETE ON public.deals
 FOR EACH ROW EXECUTE FUNCTION rk_payment_private.guard_schedule();
CREATE TRIGGER rk_skip_schedule_guard BEFORE INSERT OR UPDATE OR DELETE ON public.payment_skips
 FOR EACH ROW EXECUTE FUNCTION rk_payment_private.guard_schedule();

CREATE FUNCTION public.rk_payment_capabilities() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('version',1,'enabled',enabled)
 FROM rk_payment_private.configuration WHERE id;
$$;
REVOKE ALL ON FUNCTION public.rk_payment_capabilities() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rk_payment_capabilities() TO authenticated;

CREATE INDEX rk_payments_deal_due ON public.payments (deal_id, due_date);
CREATE INDEX rk_promises_deal_due ON public.payment_promises (deal_id, original_due_date);
CREATE INDEX rk_promises_parent ON public.payment_promises (parent_promise_id);

-- Read-only schedule parity with getDealDueSchedule: date clamping, monthly
-- starts one month after start_date, biweekly starts on first_payment_date.
-- Missing legacy skip move metadata is rejected rather than guessed.
CREATE FUNCTION rk_payment_private.schedule(p_deal uuid)
RETURNS TABLE(due_date date, amount_due numeric)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  d public.deals%rowtype;
  frequency text;
  first_date date;
  first_day int;
  month_start date;
  day_no int;
  candidate date;
  dates date[] := '{}';
  amounts numeric[] := '{}';
  i int;
  s public.payment_skips%rowtype;
BEGIN
  SELECT * INTO STRICT d FROM public.deals WHERE id=p_deal;
  frequency := CASE WHEN d.deal_type='Cash' THEN 'Cash'
    WHEN d.deal_type='Registration Money' THEN 'One-Time'
    ELSE coalesce(d.payment_frequency,'Monthly') END;
  IF frequency='Cash' OR coalesce(d.monthly_payment,0)<=0 THEN RETURN; END IF;
  first_date := coalesce(d.first_payment_date,d.start_date);
  IF frequency='One-Time' THEN
    IF first_date IS NULL THEN RETURN; END IF;
    dates := ARRAY[first_date];
  ELSIF coalesce(d.term,0)>0 THEN
    IF d.term>1200 THEN RAISE EXCEPTION 'Schedule needs review: excessive term'; END IF;
    IF frequency='Biweekly' THEN
      IF first_date IS NULL THEN RETURN; END IF;
      FOR i IN 0..d.term-1 LOOP dates:=array_append(dates,first_date+i*14); END LOOP;
    ELSIF frequency='Semi-Monthly' THEN
      IF first_date IS NULL OR d.second_due_day IS NULL THEN RETURN; END IF;
      IF d.second_due_day NOT BETWEEN 1 AND 31 THEN RETURN; END IF;
      first_day:=extract(day from first_date)::int;
      month_start:=date_trunc('month',first_date)::date;
      WHILE cardinality(dates)<d.term LOOP
        FOR candidate IN
          SELECT month_start + (least(v.day,extract(day from month_start+interval '1 month - 1 day')::int)-1)
          FROM (VALUES(first_day),(d.second_due_day)) v(day) ORDER BY 1
        LOOP
          IF candidate>=first_date AND cardinality(dates)<d.term THEN
            dates:=array_append(dates,candidate);
          END IF;
        END LOOP;
        month_start:=(month_start+interval '1 month')::date;
      END LOOP;
    ELSE
      IF d.start_date IS NULL OR d.due_day IS NULL THEN RETURN; END IF;
      IF d.due_day NOT BETWEEN 1 AND 31 THEN RAISE EXCEPTION 'Invalid due day'; END IF;
      FOR i IN 1..d.term LOOP
        month_start:=(date_trunc('month',d.start_date)+make_interval(months=>i))::date;
        day_no:=least(d.due_day,extract(day from month_start+interval '1 month - 1 day')::int);
        dates:=array_append(dates,month_start+day_no-1);
      END LOOP;
    END IF;
  END IF;
  IF cardinality(dates)=0 THEN RETURN; END IF;
  amounts:=array_fill(d.monthly_payment,ARRAY[cardinality(dates)]);
  FOR s IN SELECT * FROM public.payment_skips
    WHERE deal_id=p_deal AND coalesce(skip_status,'Active')<>'Cancelled'
    ORDER BY original_due_date,id
  LOOP
    IF s.moved_due_date IS NULL OR s.original_due_date IS NULL OR coalesce(s.amount_due,0)<=0 THEN
      RAISE EXCEPTION 'Legacy skip metadata needs review';
    END IF;
    FOR i IN 1..cardinality(dates) LOOP
      IF dates[i]=s.original_due_date OR i=s.installment_no THEN amounts[i]:=0; END IF;
    END LOOP;
    dates:=array_append(dates,s.moved_due_date);
    amounts:=array_append(amounts,s.amount_due);
  END LOOP;
  RETURN QUERY SELECT u.dt,u.amt FROM unnest(dates,amounts) u(dt,amt) WHERE u.amt>0;
END;
$$;

-- Recompute from the complete installment ledger, not promise_id alone.
-- Reject historical ambiguity instead of treating a residual root as gross debt.
CREATE FUNCTION rk_payment_private.promise_state(p_deal uuid,p_due date)
RETURNS TABLE(leaf_id uuid, leaf_status text, gross numeric, paid numeric, remaining numeric)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  root public.payment_promises%rowtype;
  leaf public.payment_promises%rowtype;
  root_count int;
  leaf_count int;
  node_count int;
  reached int;
  basis numeric;
  basis_count int;
  paid_total numeric;
BEGIN
  SELECT count(*) INTO node_count FROM public.payment_promises
    WHERE deal_id=p_deal AND original_due_date=p_due;
  IF node_count=0 THEN RETURN; END IF;
  SELECT count(*) INTO root_count FROM public.payment_promises
    WHERE deal_id=p_deal AND original_due_date=p_due AND parent_promise_id IS NULL;
  IF root_count<>1 THEN RAISE EXCEPTION 'Promise roots need manual review'; END IF;
  SELECT * INTO STRICT root FROM public.payment_promises
    WHERE deal_id=p_deal AND original_due_date=p_due AND parent_promise_id IS NULL;
  WITH RECURSIVE chain AS (
    SELECT root.id AS id
    UNION
    SELECT p.id FROM public.payment_promises p JOIN chain c ON p.parent_promise_id=c.id
      WHERE p.deal_id=p_deal AND p.original_due_date=p_due
  ) SELECT count(*) INTO reached FROM chain;
  IF reached<>node_count OR EXISTS (
    SELECT 1 FROM public.payment_promises p JOIN public.payment_promises c ON c.parent_promise_id=p.id
    WHERE p.deal_id=p_deal AND p.original_due_date=p_due
      AND (c.deal_id IS DISTINCT FROM p.deal_id OR c.original_due_date IS DISTINCT FROM p.original_due_date)
  ) OR EXISTS (
    SELECT p.id FROM public.payment_promises p JOIN public.payment_promises c ON c.parent_promise_id=p.id
    WHERE p.deal_id=p_deal AND p.original_due_date=p_due GROUP BY p.id HAVING count(*)>1
  ) THEN RAISE EXCEPTION 'Promise chain needs manual review'; END IF;
  SELECT count(*) INTO leaf_count FROM public.payment_promises p
    WHERE p.deal_id=p_deal AND p.original_due_date=p_due
      AND NOT EXISTS(SELECT 1 FROM public.payment_promises c WHERE c.parent_promise_id=p.id);
  IF leaf_count<>1 THEN RAISE EXCEPTION 'Promise leaf needs manual review'; END IF;
  SELECT * INTO STRICT leaf FROM public.payment_promises p
    WHERE p.deal_id=p_deal AND p.original_due_date=p_due
      AND NOT EXISTS(SELECT 1 FROM public.payment_promises c WHERE c.parent_promise_id=p.id);
  IF leaf.promise_status IS NULL OR leaf.promise_status IN ('Partial Paid','Rescheduled') THEN
    RAISE EXCEPTION 'Promise replacement is missing';
  END IF;
  SELECT count(*),min(o.amount_due) INTO basis_count,basis
    FROM rk_payment_private.obligations o WHERE o.deal_id=p_deal AND o.due_date=p_due;
  IF basis_count=0 THEN
    SELECT count(*),min(s.amount_due) INTO basis_count,basis
      FROM rk_payment_private.schedule(p_deal) s WHERE s.due_date=p_due;
  END IF;
  IF basis_count<>1 OR root.amount_due IS DISTINCT FROM basis OR EXISTS (
    SELECT 1 FROM public.payment_promises p WHERE p.deal_id=p_deal AND p.original_due_date=p_due
      AND p.amount_due IS DISTINCT FROM root.amount_due
  ) THEN RAISE EXCEPTION 'Historical promise basis needs review'; END IF;
  IF EXISTS (SELECT 1 FROM public.payments x WHERE x.deal_id=p_deal
      AND x.due_date IS NULL AND x.amount_paid>0 AND x.payment_status IS DISTINCT FROM 'Voided'
      AND NOT EXISTS (SELECT 1 FROM rk_payment_private.obligations o WHERE o.deal_id=p_deal AND o.due_date=p_due))
    OR EXISTS (SELECT 1 FROM public.payments x JOIN public.payment_promises p ON p.id=x.promise_id
      WHERE p.deal_id=p_deal AND p.original_due_date=p_due
        AND (x.deal_id IS DISTINCT FROM p_deal OR x.due_date IS DISTINCT FROM p_due))
    OR EXISTS (SELECT 1 FROM public.payments x LEFT JOIN public.payment_promises p ON p.id=x.promise_id
      WHERE x.deal_id=p_deal AND x.due_date=p_due AND x.promise_id IS NOT NULL
        AND (p.deal_id IS DISTINCT FROM p_deal OR p.original_due_date IS DISTINCT FROM p_due))
  THEN RAISE EXCEPTION 'Payment allocation needs manual review'; END IF;
  IF EXISTS(SELECT 1 FROM public.payments x WHERE x.deal_id=p_deal AND x.due_date=p_due
      AND (x.amount_paid IS NULL OR x.amount_paid<0 OR x.amount_paid::text IN ('NaN','Infinity','-Infinity')))
  THEN RAISE EXCEPTION 'Payment amount needs manual review'; END IF;
  SELECT coalesce(sum(x.amount_paid),0) INTO paid_total FROM public.payments x
    WHERE x.deal_id=p_deal AND x.due_date=p_due AND x.payment_status IS DISTINCT FROM 'Voided';
  IF paid_total>basis THEN RAISE EXCEPTION 'Overallocated installment needs manual review'; END IF;
  RETURN QUERY SELECT leaf.id,leaf.promise_status,basis,paid_total,greatest(basis-paid_total,0);
END;
$$;

CREATE FUNCTION public.rk_payment_operation(p_request_id uuid,p_operation text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  prior rk_payment_private.operations%rowtype;
  d public.deals%rowtype;
  payment public.payments%rowtype;
  promise public.payment_promises%rowtype;
  state record;
  item jsonb;
  result jsonb;
  rows_json jsonb := '[]';
  deal_id_value uuid;
  due_value date;
  dates date[] := '{}';
  amount numeric;
  basis numeric;
  paid_before numeric;
  balance_before numeric;
  schedule_count int;
  promise_link uuid;
  payment_kind text;
  frequency text;
  paid_total numeric;
  new_status text;
  preserve_legacy_status boolean;
  promises_json jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR p_operation IS NULL OR p_operation NOT IN ('record','void','promise_paid','promise_partial','reschedule')
  THEN RAISE EXCEPTION 'Invalid operation'; END IF;
  -- Serializes retries even before the completed operation exists.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_id::text,0));
  SELECT * INTO prior FROM rk_payment_private.operations
    WHERE actor_id=actor AND request_id=p_request_id;
  IF FOUND THEN
    IF prior.operation<>p_operation OR prior.payload<>p_payload THEN
      RAISE EXCEPTION 'Request ID was already used for different input';
    END IF;
    RETURN prior.result;
  END IF;
  IF NOT (SELECT enabled FROM rk_payment_private.configuration WHERE id) THEN
    RAISE EXCEPTION 'Payment saves are temporarily unavailable during rollout';
  END IF;
  PERFORM set_config('rk.payment_operation','v1',true);
  deal_id_value:=(p_payload->>'dealId')::uuid;
  SELECT * INTO STRICT d FROM public.deals WHERE id=deal_id_value FOR UPDATE;
  -- Every writer in the future release must acquire this same deal lock.
  -- Existing policies are preserved; INVOKER does not bypass RLS.
  PERFORM id FROM public.payment_promises WHERE deal_id=deal_id_value ORDER BY id FOR UPDATE;
  PERFORM id FROM public.payments WHERE deal_id=deal_id_value ORDER BY id FOR UPDATE;
  preserve_legacy_status:=EXISTS(SELECT 1 FROM public.payments x WHERE x.deal_id=deal_id_value
    AND x.due_date IS NULL AND x.amount_paid>0 AND x.payment_status IS DISTINCT FROM 'Voided')
    OR EXISTS(SELECT 1 FROM public.payment_promises p WHERE p.deal_id=deal_id_value
      AND p.promise_status='Paid' AND p.remaining_amount<>0)
    OR EXISTS(SELECT 1 FROM public.payment_promises p WHERE p.deal_id=deal_id_value
      AND p.parent_promise_id IS NULL GROUP BY p.original_due_date HAVING count(*)>1);
  frequency:=CASE WHEN d.deal_type='Registration Money' THEN 'One-Time'
    ELSE coalesce(d.payment_frequency,'Monthly') END;

  -- Terminal monetary snapshots on untracked legacy promises are not repair targets.
  IF EXISTS(SELECT 1 FROM public.payment_promises p
    WHERE p.deal_id=deal_id_value AND p.promise_status='Paid' AND p.remaining_amount<>0
      AND (p.id=(p_payload->>'promiseId')::uuid OR p.original_due_date IN
        (SELECT x.due_date FROM public.payments x WHERE x.id=(p_payload->>'paymentId')::uuid)
        OR p.original_due_date IN (SELECT (a->>'dueDate')::date
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_payload->'allocations')='array'
            THEN p_payload->'allocations' ELSE '[]'::jsonb END) a))) THEN
    RAISE EXCEPTION 'Ambiguous legacy obligation; historical state preserved';
  END IF;
  IF p_operation='void' THEN
    IF nullif(btrim(p_payload->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'Void reason required'; END IF;
    SELECT * INTO STRICT payment FROM public.payments
      WHERE id=(p_payload->>'paymentId')::uuid AND deal_id=deal_id_value;
    due_value:=payment.due_date;
    -- Validate before mutating: a repeated void is a no-op, not another subtraction.
    IF payment.payment_status IS DISTINCT FROM 'Voided' THEN
      PERFORM * FROM rk_payment_private.promise_state(deal_id_value,due_value);
      IF due_value IS NULL OR (payment.promise_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.payment_promises p WHERE p.id=payment.promise_id
          AND p.deal_id=deal_id_value AND p.original_due_date=due_value
      )) THEN
        RAISE EXCEPTION 'Payment obligation needs review before voiding';
      END IF;
      UPDATE public.payments SET payment_status='Voided',void_reason=p_payload->>'reason',voided_at=now()
        WHERE id=payment.id RETURNING * INTO payment;
      IF NOT FOUND THEN RAISE EXCEPTION 'Payment update denied' USING ERRCODE='42501'; END IF;
      dates:=ARRAY[due_value];
    END IF;
    rows_json:=jsonb_build_array(to_jsonb(payment));
  ELSIF p_operation IN ('promise_paid','promise_partial','reschedule') THEN
    SELECT * INTO STRICT promise FROM public.payment_promises
      WHERE id=(p_payload->>'promiseId')::uuid AND deal_id=deal_id_value;
    due_value:=promise.original_due_date;
    SELECT * INTO STRICT state FROM rk_payment_private.promise_state(deal_id_value,due_value);
    IF state.leaf_id<>promise.id OR state.leaf_status NOT IN ('Pending','Broken') OR state.remaining<=0
      OR state.remaining IS DISTINCT FROM (p_payload->>'expectedRemaining')::numeric
    THEN RAISE EXCEPTION 'Promise changed; reload before submitting'; END IF;
    INSERT INTO rk_payment_private.obligations(deal_id,due_date,amount_due)
      VALUES(deal_id_value,due_value,state.gross) ON CONFLICT DO NOTHING;
    IF p_operation<>'promise_paid' AND (p_payload->>'newPromisedDate')::date IS NULL THEN
      RAISE EXCEPTION 'New promise date required';
    END IF;
    IF p_operation='reschedule' THEN
      amount:=0;
    ELSE
      amount:=CASE WHEN p_operation='promise_paid' THEN state.remaining ELSE (p_payload->>'amountPaid')::numeric END;
      IF amount IS NULL OR amount<=0 OR amount::text IN ('NaN','Infinity','-Infinity')
        OR amount<>round(amount,2) OR amount>state.remaining
        OR (p_operation='promise_partial' AND amount>=state.remaining)
      THEN RAISE EXCEPTION 'Invalid promise payment amount'; END IF;
      IF (p_payload->>'paymentDate')::date IS NULL OR nullif(p_payload->>'paymentMethod','') IS NULL THEN
        RAISE EXCEPTION 'Payment date and method required';
      END IF;
      INSERT INTO public.payments(deal_id,promise_id,payment_date,due_date,amount_due,amount_paid,
        remaining_amount,payment_method,payment_type,payment_status,notes)
      VALUES(deal_id_value,promise.id,(p_payload->>'paymentDate')::date,due_value,state.remaining,amount,
        state.remaining-amount,p_payload->>'paymentMethod',
        CASE WHEN p_operation='promise_paid' THEN 'Promise Payment' ELSE 'Partial Promise Payment' END,
        CASE WHEN p_operation='promise_paid' THEN 'Paid' ELSE 'Partial' END,p_payload->>'notes')
      RETURNING * INTO payment;
      rows_json:=jsonb_build_array(to_jsonb(payment));
    END IF;
    IF p_operation IN ('promise_partial','reschedule') THEN
      UPDATE public.payment_promises SET promise_status=CASE WHEN p_operation='reschedule'
        THEN 'Rescheduled' ELSE 'Partial Paid' END,
        reschedule_reason=coalesce(p_payload->>'reason',p_payload->>'notes',reschedule_reason)
        WHERE id=promise.id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Promise update denied' USING ERRCODE='42501'; END IF;
      INSERT INTO public.payment_promises(deal_id,original_due_date,amount_due,amount_paid_now,
        remaining_amount,promised_date,promise_status,notes,parent_promise_id,rescheduled_from_date,reschedule_reason)
      VALUES(deal_id_value,due_value,state.gross,state.paid+amount,state.remaining-amount,
        (p_payload->>'newPromisedDate')::date,'Pending',p_payload->>'notes',promise.id,promise.promised_date,
        coalesce(p_payload->>'reason',p_payload->>'notes'));
    END IF;
    dates:=ARRAY[due_value];
  ELSE
    IF jsonb_typeof(p_payload->'allocations') IS DISTINCT FROM 'array'
      OR jsonb_array_length(p_payload->'allocations') NOT BETWEEN 1 AND 1200
      OR (p_payload->>'paymentDate')::date IS NULL OR nullif(p_payload->>'paymentMethod','') IS NULL
    THEN RAISE EXCEPTION 'Payment date, method and allocations required'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'allocations') LOOP
      due_value:=(item->>'dueDate')::date;
      amount:=(item->>'amountPaid')::numeric;
      IF due_value IS NULL OR due_value=ANY(dates) OR amount IS NULL OR amount<=0
        OR amount::text IN ('NaN','Infinity','-Infinity') OR amount<>round(amount,2)
      THEN RAISE EXCEPTION 'Invalid allocation'; END IF;
      SELECT count(*),min(o.amount_due) INTO schedule_count,basis
        FROM rk_payment_private.obligations o WHERE o.deal_id=deal_id_value AND o.due_date=due_value;
      IF schedule_count=0 THEN
        SELECT count(*),min(s.amount_due) INTO schedule_count,basis
          FROM rk_payment_private.schedule(deal_id_value) s WHERE s.due_date=due_value;
      END IF;
      IF schedule_count<>1 THEN RAISE EXCEPTION 'Installment missing, skipped, or ambiguous'; END IF;
      IF basis IS NULL OR basis<=0 OR basis<>round(basis,2) OR basis::text IN ('NaN','Infinity','-Infinity')
        OR EXISTS(SELECT 1 FROM public.payments x WHERE x.deal_id=deal_id_value AND x.due_date=due_value
          AND x.payment_status IS DISTINCT FROM 'Voided' AND (x.amount_paid IS NULL OR x.amount_paid<0
            OR x.amount_paid<>round(x.amount_paid,2) OR x.amount_paid::text IN ('NaN','Infinity','-Infinity'))) THEN
        RAISE EXCEPTION 'Ambiguous installment amount; historical state preserved';
      END IF;
      SELECT coalesce(sum(x.amount_paid),0) INTO paid_before FROM public.payments x
        WHERE x.deal_id=deal_id_value AND x.due_date=due_value AND x.payment_status IS DISTINCT FROM 'Voided';
      balance_before:=greatest(basis-paid_before,0);
      IF paid_before IS DISTINCT FROM (item->>'expectedPaid')::numeric
        OR balance_before IS DISTINCT FROM (item->>'expectedRemaining')::numeric OR amount>balance_before
      THEN RAISE EXCEPTION 'Installment changed; reload before submitting'; END IF;
      SELECT * INTO state FROM rk_payment_private.promise_state(deal_id_value,due_value);
      promise_link:=NULL;
      IF FOUND THEN
        -- Cancellation ends the commitment, not the debt. Preserve the cancelled row.
        IF state.leaf_status<>'Cancelled' THEN promise_link:=state.leaf_id;
        ELSIF nullif(item->>'promisedDate','') IS NOT NULL AND amount<balance_before THEN
          INSERT INTO public.payment_promises(deal_id,original_due_date,amount_due,amount_paid_now,
            remaining_amount,promised_date,promise_status,notes,parent_promise_id,rescheduled_from_date)
          SELECT deal_id,original_due_date,state.gross,state.paid,state.remaining,
            (item->>'promisedDate')::date,'Pending',item->>'notes',id,promised_date
            FROM public.payment_promises WHERE id=state.leaf_id RETURNING id INTO promise_link;
        END IF;
      ELSIF nullif(item->>'promisedDate','') IS NOT NULL AND amount<balance_before THEN
        -- New roots consistently store the gross installment obligation.
        INSERT INTO public.payment_promises(deal_id,original_due_date,amount_due,amount_paid_now,
          remaining_amount,promised_date,promise_status,notes)
        VALUES(deal_id_value,due_value,basis,paid_before,balance_before,
          (item->>'promisedDate')::date,'Pending',item->>'notes') RETURNING id INTO promise_link;
      END IF;
      INSERT INTO rk_payment_private.obligations(deal_id,due_date,amount_due)
        VALUES(deal_id_value,due_value,basis) ON CONFLICT DO NOTHING;
      IF nullif(item->>'promisedDate','') IS NOT NULL THEN
        IF (item->>'promisedDate')::date < (p_payload->>'paymentDate')::date THEN
          RAISE EXCEPTION 'Promise date cannot precede payment date';
        END IF;
        IF promise_link IS NOT NULL AND amount<balance_before THEN
          UPDATE public.payment_promises SET promised_date=(item->>'promisedDate')::date WHERE id=promise_link;
          IF NOT FOUND THEN RAISE EXCEPTION 'Promise update denied' USING ERRCODE='42501'; END IF;
        END IF;
      END IF;
      payment_kind:=CASE WHEN amount>=balance_before THEN
        CASE frequency WHEN 'Biweekly' THEN 'Full Biweekly Payment' WHEN 'One-Time' THEN 'Full One-Time Payment' ELSE 'Full Payment' END
        ELSE 'Partial '||CASE frequency WHEN 'Biweekly' THEN 'Biweekly Payment' WHEN 'One-Time' THEN 'One-Time Payment' ELSE 'Payment' END||
        CASE WHEN nullif(item->>'promisedDate','') IS NOT NULL THEN ' - Promise Pending' ELSE ' - No Promise Date' END END;
      INSERT INTO public.payments(deal_id,promise_id,payment_date,due_date,amount_due,amount_paid,
        remaining_amount,payment_method,payment_type,payment_status,notes)
      VALUES(deal_id_value,promise_link,(p_payload->>'paymentDate')::date,due_value,balance_before,amount,
        balance_before-amount,p_payload->>'paymentMethod',payment_kind,'Active',item->>'notes')
      RETURNING * INTO payment;
      rows_json:=rows_json||jsonb_build_array(to_jsonb(payment));
      dates:=array_append(dates,due_value);
    END LOOP;
  END IF;

  FOREACH due_value IN ARRAY dates LOOP
    SELECT * INTO state FROM rk_payment_private.promise_state(deal_id_value,due_value);
    IF FOUND AND state.leaf_status<>'Cancelled' THEN
      UPDATE public.payment_promises SET amount_paid_now=state.paid,remaining_amount=state.remaining,
        promise_status=CASE WHEN state.remaining=0 THEN 'Paid'
          WHEN promised_date<(now() AT TIME ZONE 'UTC')::date THEN 'Broken' ELSE 'Pending' END
        WHERE id=state.leaf_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Promise reconciliation denied' USING ERRCODE='42501'; END IF;
    END IF;
  END LOOP;
  SELECT coalesce(sum(x.amount_paid),0) INTO paid_total FROM public.payments x
    WHERE x.deal_id=deal_id_value AND x.payment_status IS DISTINCT FROM 'Voided';
  new_status:=d.status;
  -- Preserve the existing paid-off status rule; terminal-status semantics
  -- should be reviewed separately rather than changed in this migration.
  IF NOT preserve_legacy_status AND coalesce(d.total_amount,0)>0 AND paid_total>=d.total_amount THEN new_status:='Paid Off';
  ELSIF NOT preserve_legacy_status AND paid_total<coalesce(d.total_amount,0) AND d.status='Paid Off' THEN new_status:='Active'; END IF;
  IF new_status IS DISTINCT FROM d.status THEN
    UPDATE public.deals SET status=new_status WHERE id=deal_id_value;
    IF NOT FOUND THEN RAISE EXCEPTION 'Deal status update denied' USING ERRCODE='42501'; END IF;
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') INTO promises_json
    FROM public.payment_promises p WHERE p.deal_id=deal_id_value AND p.original_due_date=ANY(dates);
  result:=jsonb_build_object('version',1,'promises',promises_json,'legacyStatusPreserved',preserve_legacy_status,'payments',rows_json,'dealId',deal_id_value,'dealStatus',new_status,
    'totalPaid',paid_total,'balance',greatest(coalesce(d.total_amount,0)-paid_total,0));
  INSERT INTO rk_payment_private.operations(actor_id,request_id,operation,payload,result)
    VALUES(actor,p_request_id,p_operation,p_payload,result);
  PERFORM set_config('rk.payment_operation','',true);
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION rk_payment_private.guard_writes() FROM PUBLIC;
REVOKE ALL ON FUNCTION rk_payment_private.guard_schedule() FROM PUBLIC;
REVOKE ALL ON FUNCTION rk_payment_private.schedule(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION rk_payment_private.promise_state(uuid,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rk_payment_operation(uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rk_payment_private.schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rk_payment_private.promise_state(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rk_payment_operation(uuid,text,jsonb) TO authenticated;

-- Correct automatic skipped-installment date compatibility before commit.
CREATE OR REPLACE FUNCTION rk_payment_private.schedule(p_deal uuid)
RETURNS TABLE(due_date date, amount_due numeric)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  d public.deals%rowtype;
  frequency text;
  first_date date;
  first_day int;
  month_start date;
  day_no int;
  candidate date;
  dates date[] := '{}';
  amounts numeric[] := '{}';
  i int;
  s public.payment_skips%rowtype;
  base_count int;
  last_due date;
  moved_due date;
  next_month date;
  next_candidate date;
  month_offset int;
BEGIN
  SELECT * INTO STRICT d FROM public.deals WHERE id=p_deal;
  frequency := CASE WHEN d.deal_type='Cash' THEN 'Cash'
    WHEN d.deal_type='Registration Money' THEN 'One-Time'
    ELSE coalesce(d.payment_frequency,'Monthly') END;
  IF frequency='Cash' OR coalesce(d.monthly_payment,0)<=0 THEN RETURN; END IF;
  first_date := coalesce(d.first_payment_date,d.start_date);
  IF frequency='One-Time' THEN
    IF first_date IS NULL THEN RETURN; END IF;
    dates := ARRAY[first_date];
  ELSIF coalesce(d.term,0)>0 THEN
    IF d.term>1200 THEN RAISE EXCEPTION 'Schedule needs review: excessive term'; END IF;
    IF frequency='Biweekly' THEN
      IF first_date IS NULL THEN RETURN; END IF;
      FOR i IN 0..d.term-1 LOOP dates:=array_append(dates,first_date+i*14); END LOOP;
    ELSIF frequency='Semi-Monthly' THEN
      IF first_date IS NULL OR d.second_due_day IS NULL THEN RETURN; END IF;
      IF d.second_due_day NOT BETWEEN 1 AND 31 THEN RETURN; END IF;
      first_day:=extract(day from first_date)::int;
      month_start:=date_trunc('month',first_date)::date;
      WHILE cardinality(dates)<d.term LOOP
        FOR candidate IN
          SELECT month_start + (least(v.day,extract(day from month_start+interval '1 month - 1 day')::int)-1)
          FROM (VALUES(first_day),(d.second_due_day)) v(day) ORDER BY 1
        LOOP
          IF candidate>=first_date AND cardinality(dates)<d.term THEN
            dates:=array_append(dates,candidate);
          END IF;
        END LOOP;
        month_start:=(month_start+interval '1 month')::date;
      END LOOP;
    ELSE
      IF d.start_date IS NULL OR d.due_day IS NULL THEN RETURN; END IF;
      IF d.due_day NOT BETWEEN 1 AND 31 THEN RAISE EXCEPTION 'Invalid due day'; END IF;
      FOR i IN 1..d.term LOOP
        month_start:=(date_trunc('month',d.start_date)+make_interval(months=>i))::date;
        day_no:=least(d.due_day,extract(day from month_start+interval '1 month - 1 day')::int);
        dates:=array_append(dates,month_start+day_no-1);
      END LOOP;
    END IF;
  END IF;
  IF cardinality(dates)=0 THEN RETURN; END IF;
  base_count:=cardinality(dates);
  last_due:=dates[base_count];
  amounts:=array_fill(d.monthly_payment,ARRAY[base_count]);
  FOR s IN SELECT * FROM public.payment_skips
    WHERE deal_id=p_deal AND coalesce(skip_status,'Active')<>'Cancelled'
    ORDER BY original_due_date,id
  LOOP
    IF s.original_due_date IS NULL OR coalesce(s.amount_due,0)<=0 THEN
      RAISE EXCEPTION 'Legacy skip metadata needs review';
    END IF;
    FOR i IN 1..base_count LOOP
      IF dates[i]=s.original_due_date OR i=s.installment_no THEN amounts[i]:=0; END IF;
    END LOOP;
    -- Match applySkipsToSchedule/getNextDueDateAfter without backfilling rows.
    moved_due:=s.moved_due_date;
    IF moved_due IS NULL THEN
      IF frequency='Biweekly' THEN
        moved_due:=last_due+14;
      ELSIF frequency='Semi-Monthly' THEN
        first_day:=extract(day from first_date)::int;
        IF first_day IS NULL OR d.second_due_day IS NULL OR d.second_due_day NOT BETWEEN 1 AND 31 THEN
          RAISE EXCEPTION 'Invalid semi-monthly skip schedule';
        END IF;
        FOR month_offset IN 0..23 LOOP
          next_month:=(date_trunc('month',last_due)+make_interval(months=>month_offset))::date;
          SELECT min(next_month + least(v.day,extract(day from next_month+interval '1 month - 1 day')::int)-1)
          INTO next_candidate FROM (VALUES(first_day),(d.second_due_day)) v(day)
          WHERE next_month + least(v.day,extract(day from next_month+interval '1 month - 1 day')::int)-1 > last_due;
          IF next_candidate IS NOT NULL THEN moved_due:=next_candidate; EXIT; END IF;
        END LOOP;
        IF moved_due IS NULL THEN RAISE EXCEPTION 'Skip schedule could not advance'; END IF;
      ELSE
        next_month:=(date_trunc('month',last_due)+interval '1 month')::date;
        day_no:=coalesce(nullif(d.due_day,0),extract(day from last_due)::int);
        IF day_no NOT BETWEEN 1 AND 31 THEN RAISE EXCEPTION 'Invalid skip due day'; END IF;
        moved_due:=next_month+least(day_no,extract(day from next_month+interval '1 month - 1 day')::int)-1;
      END IF;
    END IF;
    last_due:=moved_due;
    dates:=array_append(dates,moved_due);
    amounts:=array_append(amounts,s.amount_due);
  END LOOP;
  RETURN QUERY SELECT u.dt,u.amt FROM unnest(dates,amounts) u(dt,amt) WHERE u.amt>0;
END;
$$;

-- Standalone Deal Stories feature included in the matching code release.
-- Independent shared dealership notebook. No relationships to business tables.
create table public.deal_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null check (char_length(btrim(body)) between 1 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (title || ' ' || body) stored
);
create index deal_stories_updated_idx on public.deal_stories (updated_at desc, id desc);
alter table public.deal_stories enable row level security;
revoke all on public.deal_stories from public, anon, authenticated;
grant select, insert, update on public.deal_stories to authenticated;
-- This application is one shared dealership workspace, like customer_followups.
-- Exclude anonymous Auth sessions as well as signed-out API requests.
create policy deal_stories_read on public.deal_stories for select to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create policy deal_stories_create on public.deal_stories for insert to authenticated
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create policy deal_stories_edit on public.deal_stories for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false')
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create function public.touch_deal_story() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.touch_deal_story() from public, anon, authenticated;
create trigger deal_story_updated before update on public.deal_stories
for each row execute function public.touch_deal_story();

NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT public.rk_payment_capabilities() AS installed_capabilities;
-- Expected version=1, enabled=false. Continue with 02_verify.sql.
