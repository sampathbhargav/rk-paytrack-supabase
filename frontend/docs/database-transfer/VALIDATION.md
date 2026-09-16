# Transfer package validation

Validated on disposable local PostgreSQL 17 with synthetic original-schema fixtures. No Supabase project was modified.

- PASS: installation in one transaction.
- PASS: capabilities disabled by default.
- PASS: duplicate installation rejected without overwriting existing objects.
- PASS: read-only verification queries.
- PASS: separate activation.
- PASS: skipped-installment partial payment, promise payoff, same-request replay, legitimate separate payment, void reopening, atomic rollback and unchanged skip metadata.
- PASS: optional emergency pause revokes the mutation RPC while retaining enabled guards.
- Local server stopped after testing.

Fixtures use simplified Auth/RLS; destination schema and real application authentication still require validation. No new browser or destination integration acceptance is claimed.

## SQL file SHA-256

- `01_install.sql`: `9e9c4727c1647f713d7d90411e61a9f46b259dc6ca36e0e8b9fc6914f96b4fc7`
- `02_verify.sql`: `8b3aabebe71845818cd109f4be8317a819072cef41b2c3d7e6af65ee417d91e7`
- `03_activate_after_deploy.sql`: `f26d6f282de9d073e74f129559a0137ffd06125d4ddb6e67e61668cbd8ea487f`
- `04_emergency_pause_ONLY.sql`: `cc598ca51b4ca84b78833deb3e043366002fd68a8308a91398cc1182e7252107`
