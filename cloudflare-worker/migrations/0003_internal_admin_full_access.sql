-- Internal admin account hardening: permanent full-access entitlement for review/admin account.
-- This keeps normal commercial gating unchanged for all other users.

PRAGMA foreign_keys = ON;

UPDATE users
SET
  role = 'admin',
  account_status = 'active',
  email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
  updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = lower('saviosyl@gmail.com');

INSERT INTO subscriptions (
  user_id,
  status,
  plan_code,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
SELECT
  id,
  'active',
  'internal-full-access',
  CURRENT_TIMESTAMP,
  datetime('now', '+25 years'),
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM users
WHERE lower(email) = lower('saviosyl@gmail.com')
ON CONFLICT(user_id) DO UPDATE SET
  status = 'active',
  plan_code = 'internal-full-access',
  current_period_start = COALESCE(subscriptions.current_period_start, CURRENT_TIMESTAMP),
  current_period_end = datetime('now', '+25 years'),
  cancel_at_period_end = 0,
  updated_at = CURRENT_TIMESTAMP;
