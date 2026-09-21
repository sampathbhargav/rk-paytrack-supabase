# Browser session controls

Local implementation: 24-hour maximum application session; 1-hour inactivity lock; warning during the final two minutes. Trusted pointer, keyboard and scroll activity extends inactivity only. Browser focus and token refresh do not extend it. Timers are checked on focus, visibility changes, cross-tab storage events and every second. Sleeping/background tabs are checked when resumed. The policy is scoped by Supabase session ID, retaining original authentication time across token refreshes. Users must sign in with their password after a lock. Route queries are preserved (including Add Payment deal IDs).

Payment request storage is never cleared by the lock. It neither cancels nor retries an in-flight database operation. After login, use existing Recover Payment before re-entering an uncertain transaction. Unsaved forms are not retained. Another user cannot recover the previous user's intent: existing payment storage is scoped to the authenticated actor.

## Security boundary and rollout blocker

This is a browser application lock, NOT backend session revocation or API authorization. The underlying Supabase session/token remains until sign-out or backend expiry; a modified client can bypass the UI lock. Local clock and local storage are not trusted authorization sources. No production configuration, RLS, migration, subscription or deployment changed.

Supabase native time-boxed sessions require Pro or above. Configure a 24-hour time box only after plan/configuration review; do not upgrade automatically. Native expiry is checked on refresh, with access tokens valid until their own expiry. Native inactivity measures refresh inactivity, not user interaction, so it does not replace the browser idle lock. Strict API deadlines require a separately reviewed server authorization design covering all data paths, not just payments.

Reference: https://supabase.com/docs/guides/auth/sessions

## Validation

Run `node --test tests/sessionPolicy.test.mjs tests/paymentRequests.test.mjs`, build and lint. Before release, authenticate against staging and verify two-tab activity, timeout after sleep, forced 24-hour lock, fresh login and return to query-bearing routes, failed login, and uncertain payment recovery using the same request ID. Do not create production financial test records. MFA and a device/session listing are deferred.

## Sign-out actions

The account menu uses explicit Supabase `local` scope for normal sign-out (current browser session, including its tabs). A separate confirmed action uses `global` scope for all sessions. Existing access tokens on other devices remain valid until expiry. Failed requests show an inline error and allow retry; a synchronous busy guard prevents repeated clicks. Pending payment request storage is preserved. A recovery notice is shown when a local pending intent exists, without blocking sign-out. Validate local versus global scope using two synthetic staging sessions before release. No live user sessions were revoked during implementation.
