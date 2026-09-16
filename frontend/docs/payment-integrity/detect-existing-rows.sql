-- READ ONLY. Candidate detection, not permission to repair financial history.
-- Run as a SELECT through the Supabase plugin. IDs identify review candidates;
-- no customer names, notes, or contact details are exported.
with roots as (
  select deal_id, original_due_date, count(*) as root_count
  from public.payment_promises where parent_promise_id is null
  group by deal_id, original_due_date
), children as (
  select parent_promise_id, count(*) as child_count
  from public.payment_promises where parent_promise_id is not null
  group by parent_promise_id
), candidates as (
  select 'multiple_roots_for_installment' as reason, p.id as promise_id
  from public.payment_promises p join roots r
    on r.deal_id=p.deal_id and r.original_due_date=p.original_due_date
  where r.root_count > 1
  union all
  select 'paid_with_nonzero_remaining', id from public.payment_promises
  where promise_status='Paid' and remaining_amount<>0
  union all
  select 'superseded_but_open', p.id from public.payment_promises p
  join children c on c.parent_promise_id=p.id
  where p.promise_status in ('Pending','Broken')
  union all
  select 'replacement_missing', p.id from public.payment_promises p
  where p.promise_status in ('Partial Paid','Rescheduled')
    and not exists(select 1 from children c where c.parent_promise_id=p.id)
  union all
  select 'branching_chain', parent_promise_id from children where child_count>1
  union all
  select 'cross_installment_parent', c.id from public.payment_promises c
  join public.payment_promises p on p.id=c.parent_promise_id
  where c.deal_id is distinct from p.deal_id
     or c.original_due_date is distinct from p.original_due_date
  union all
  select 'missing_obligation', id from public.payment_promises
  where deal_id is null or original_due_date is null
  union all
  select 'linked_payment_wrong_obligation', p.id from public.payment_promises p
  join public.payments x on x.promise_id=p.id
  where x.deal_id is distinct from p.deal_id
     or x.due_date is distinct from p.original_due_date
  union all
  select 'voided_payment_on_obligation_review_chain', p.id
  from public.payment_promises p
  where exists(select 1 from public.payments x
    where x.payment_status='Voided' and
      (x.promise_id=p.id or (x.deal_id=p.deal_id and x.due_date=p.original_due_date)))
  union all
  select 'undated_positive_payment_on_deal', p.id
  from public.payment_promises p
  where exists(select 1 from public.payments x where x.deal_id=p.deal_id
    and x.due_date is null and x.amount_paid>0
    and x.payment_status is distinct from 'Voided')
)
select reason, count(distinct promise_id) as candidate_count,
  array_agg(distinct promise_id) as promise_ids
from candidates group by reason order by reason;

-- A linked graph cycle must also block automatic reconciliation.
with recursive walk as (
  select id as start_id,id,parent_promise_id,array[id] as path,false as cycle
  from public.payment_promises
  union all
  select w.start_id,p.id,p.parent_promise_id,w.path||p.id,p.id=any(w.path)
  from walk w join public.payment_promises p on p.id=w.parent_promise_id
  where not w.cycle
)
select distinct start_id as promise_id from walk where cycle;

-- Compare only after the original installment basis has been verified.
-- Root amount_due can be a residual, so this is a candidate report, not a repair formula.
select p.id as promise_id, p.promise_status,
  p.amount_due as stored_basis, p.amount_paid_now as stored_paid,
  p.remaining_amount as stored_remaining,
  coalesce(sum(x.amount_paid),0) as nonvoided_paid_for_due_date,
  greatest(p.amount_due-coalesce(sum(x.amount_paid),0),0) as candidate_remaining
from public.payment_promises p
left join public.payments x on x.deal_id=p.deal_id and x.due_date=p.original_due_date
  and x.payment_status is distinct from 'Voided'
where p.promise_status in ('Pending','Broken','Paid')
  and not exists(select 1 from public.payment_promises c where c.parent_promise_id=p.id)
group by p.id
having p.remaining_amount is distinct from greatest(p.amount_due-coalesce(sum(x.amount_paid),0),0)
   or p.amount_paid_now is distinct from least(coalesce(sum(x.amount_paid),0),p.amount_due);
