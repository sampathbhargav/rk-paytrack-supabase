# Deal Stories

Route: `/deal-stories`, available from the signed-in sidebar.

Standalone shared dealership notebook with title/body entry, reading, editing,
literal substring search, and pagination. The page has no dependency on deals,
customers, payments, follow-ups, activity logs, reports, or their calculations.
Names and identifying details are written freely into the story.

`schema.sql` was applied to the configured rk-paytrack Supabase project
(`gpmrzjbqpqesvycthwsx`) as migration `standalone_deal_stories`.
It creates only the new table, its index, access policies, and its own timestamp
trigger. There are no foreign keys. Authenticated non-anonymous users share
read/create/edit access, matching the app's single-dealership workspace model.
Deletion is not exposed. Do not use this access model for multiple independent
dealerships within one Supabase project without adding tenant authorization.

Updates compare the originally loaded timestamp to prevent lost edits. Creation
uses a stable draft UUID so retrying an ambiguous save cannot create duplicates.
Failed saves keep the editor's text. Closing a dirty editor or unloading the page
prompts before discarding. Drafts are held in memory, not persistent storage.

Validation performed:
- Production Vite build passed using Node 20.19.5.
- Transactional database checks passed for create/read/update, generated search
  text, server timestamps, and rejection of stale concurrent updates.
- Anonymous Auth read/write denial and signed-out grant denial checked.
- No foreign keys and no leftover test rows confirmed after rollback.
- Security advisor returned no findings for the new database objects.
- Browser checked the authenticated page, empty state, editor, required inputs,
  multiline text, enabled Save button, and unsaved-close confirmation.
- Browser save/reopen flow and mobile layout remain manual checks.
- Lint was invoked but did not finish during validation.

Frontend code is local; no frontend deployment or git push was performed.
