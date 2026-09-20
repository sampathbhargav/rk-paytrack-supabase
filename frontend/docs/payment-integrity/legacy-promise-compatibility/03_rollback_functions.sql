-- SQL Editor patch. Test on an isolated copy first; no production data is embedded.
-- No table/data changes during installation. Future successful operations update
-- only their current non-cancelled leaf to gross installment accounting.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $version_guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('rk_payment_private.promise_state(uuid,date)')
    AND NOT p.prosecdef AND md5(regexp_replace(p.prosrc,'\s','','g'))='e3ebcea5d572e9f84db7fc00c6671b19') THEN
    RAISE EXCEPTION 'Function version mismatch: rk_payment_private.promise_state(uuid,date); nothing changed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.rk_payment_operation(uuid,text,jsonb)')
    AND NOT p.prosecdef AND md5(regexp_replace(p.prosrc,'\s','','g'))='6725dcd28ce191e665d4be4483639e70') THEN
    RAISE EXCEPTION 'Function version mismatch: public.rk_payment_operation(uuid,text,jsonb); nothing changed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('rk_payment_private.promise_state_legacy_v1(uuid,date,boolean)')
    AND NOT p.prosecdef AND md5(regexp_replace(p.prosrc,'\s','','g'))='a915751dea68d647325d9f273140a70b') THEN
    RAISE EXCEPTION 'Function version mismatch: rk_payment_private.promise_state_legacy_v1(uuid,date,boolean); nothing changed';
  END IF;
END;
$version_guard$;
CREATE OR REPLACE FUNCTION public.rk_payment_operation(p_request_id uuid, p_operation text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION rk_payment_private.promise_state(p_deal uuid, p_due date)
 RETURNS TABLE(leaf_id uuid, leaf_status text, gross numeric, paid numeric, remaining numeric)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;
DROP FUNCTION rk_payment_private.promise_state_legacy_v1(uuid,date,boolean);
COMMIT;
SELECT 'Original supplied functions restored; financial records were NOT reverted' AS result;
