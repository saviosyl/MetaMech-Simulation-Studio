# Simulation Tool Review Access Override — Temporary Cleanup Task

Status: Open (temporary review-only logic active)  
Scope: MetaMech Studio (Simulation Tool) access control only

## Why this exists

A temporary frontend review override was added to unblock internal review for:

- email: `saviosyl@gmail.com`

This is intentionally temporary and must not remain as a permanent production access pattern.

## Where the temporary logic exists

- File: `frontend/src/components/ProtectedRoute.tsx`
- Marker comment: `TEMP REVIEW-ONLY OVERRIDE`
- File: `frontend/src/utils/api.ts` (402 redirect suppression for review session)
- File: `frontend/src/lib/internalReviewAccess.ts` (email/session helper)
- File: `frontend/src/contexts/AuthContext.tsx` (review session email persistence)

## Cleanup task (required after review sign-off)

- [ ] Remove temporary review override logic from `ProtectedRoute.tsx`
- [ ] Remove temporary 402 suppression for review session from `utils/api.ts`
- [ ] Remove `internalReviewAccess.ts` helper and related session persistence calls
- [ ] Verify subscription gating works normally for all users (including admin users)
- [ ] Confirm billing-blocked behavior returns for expired/non-entitled accounts
- [ ] Deploy cleanup commit to production

## Proper long-term fix (recommended)

Use backend-admin entitlement updates in D1 instead of frontend bypass logic:

1. Keep frontend gate strict (`requireSubscription` based on backend entitlement only).
2. For internal/admin review access, set reviewer account entitlement in backend data:
   - `subscriptions.status = 'active'`
   - `subscriptions.plan_code = 'full-access'` (or internal equivalent)
   - `subscriptions.current_period_end` set to a future timestamp
3. Keep auditability in DB/state changes (who, when, why).
4. Avoid hardcoded frontend email exceptions in production code.

## SQL reference (backend entitlement path)

```sql
-- Example: grant temporary full access for internal review account
UPDATE subscriptions
SET
  status = 'active',
  plan_code = COALESCE(plan_code, 'full-access'),
  current_period_start = COALESCE(current_period_start, CURRENT_TIMESTAMP),
  current_period_end = datetime('now', '+30 days'),
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = (
  SELECT id FROM users WHERE lower(email) = lower('saviosyl@gmail.com') LIMIT 1
);
```

## Exit criteria

This task is complete when:

1. Frontend override is removed.
2. Internal reviewer account still has access via backend entitlement state.
3. Production behavior for normal users remains unchanged and secure.

