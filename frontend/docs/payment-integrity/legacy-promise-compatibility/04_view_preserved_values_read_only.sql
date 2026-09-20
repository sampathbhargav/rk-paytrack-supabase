-- Optional administrator review after a successful operation. Read-only.
-- No customer contact information or payment credentials are selected.
BEGIN TRANSACTION READ ONLY;
SELECT o.created_at AS operation_recorded_at,
       o.request_id, o.operation,
       s.value->>'id' AS promise_id,
       s.value->>'original_due_date' AS installment_due_date,
       s.value->>'amount_due' AS original_amount_due,
       s.value->>'amount_paid_now' AS original_amount_paid_now,
       s.value->>'remaining_amount' AS original_remaining_amount,
       s.value->>'promise_status' AS original_status,
       s.value->>'promised_date' AS original_promised_date,
       s.value->>'parent_promise_id' AS original_parent_id
FROM rk_payment_private.operations o
JOIN public.deals d ON d.id::text=o.payload->>'dealId'
CROSS JOIN LATERAL jsonb_array_elements(
  coalesce(o.result->'promiseSnapshotsBefore','[]'::jsonb)
) s(value)
WHERE d.deal_tag='1490'
ORDER BY o.created_at,o.request_id,s.value->>'id';
ROLLBACK;
