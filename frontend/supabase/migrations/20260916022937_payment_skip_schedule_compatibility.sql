-- Forward correction: match existing UI skip scheduling. No historical row updates.
BEGIN;
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
COMMIT;
