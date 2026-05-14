-- Stripe production billing support:
-- - subscription linkage fields
-- - webhook event idempotency table

PRAGMA foreign_keys = ON;

ALTER TABLE subscriptions ADD COLUMN provider_customer_id TEXT NULL;
ALTER TABLE subscriptions ADD COLUMN provider_price_id TEXT NULL;
ALTER TABLE subscriptions ADD COLUMN checkout_session_id TEXT NULL;
ALTER TABLE subscriptions ADD COLUMN canceled_at TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_customer_id ON subscriptions(provider_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_price_id ON subscriptions(provider_price_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id ON subscriptions(provider_subscription_id);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON stripe_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at ON stripe_webhook_events(received_at);
