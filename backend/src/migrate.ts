import { query } from './database';

const migrations = [
  {
    name: '001_create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
  },
  {
    name: '002_create_projects_table',
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    `
  },
  {
    name: '003_create_password_resets_table',
    sql: `
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
    `
  },
  {
    name: '004_add_subscription_and_secure_reset_phase1',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(32) NOT NULL DEFAULT 'trialing',
        plan_code VARCHAR(64),
        current_period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        provider VARCHAR(32),
        provider_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

      INSERT INTO subscriptions (user_id, status, plan_code, current_period_start, current_period_end)
      SELECT u.id, 'trialing', 'phase1-manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days'
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM subscriptions s WHERE s.user_id = u.id
      );
    `
  },
  {
    name: '005_trial_hardening_phase1',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMP NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_stripe_customer_id
        ON users(stripe_customer_id)
        WHERE stripe_customer_id IS NOT NULL;

      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP NULL;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP NULL;
      ALTER TABLE subscriptions ALTER COLUMN current_period_start DROP NOT NULL;

      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);

      CREATE TABLE IF NOT EXISTS trial_identity_ledger (
        id SERIAL PRIMARY KEY,
        email_hash VARCHAR(64) UNIQUE NOT NULL,
        first_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id VARCHAR(255) NULL,
        trial_consumed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_trial_identity_ledger_first_user_id ON trial_identity_ledger(first_user_id);

      -- Backward compatibility: existing accounts pre-date verification flow
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, created_at)
      WHERE email_verified_at IS NULL;
    `
  }
];

async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get already executed migrations
    const result = await query('SELECT name FROM migrations');
    const executedMigrations = new Set(result.rows.map(row => row.name));

    // Execute pending migrations
    for (const migration of migrations) {
      if (!executedMigrations.has(migration.name)) {
        console.log(`Executing migration: ${migration.name}`);
        await query(migration.sql);
        await query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
        console.log(`Migration ${migration.name} completed`);
      } else {
        console.log(`Migration ${migration.name} already executed`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0));
}

export { runMigrations };