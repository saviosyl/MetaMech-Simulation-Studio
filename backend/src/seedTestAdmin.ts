import bcrypt from 'bcryptjs';
import { pool, query } from './database';

function parseSubscriptionDays(): number {
  const raw = Number(process.env.TEST_ADMIN_SUBSCRIPTION_DAYS || 3650);
  if (!Number.isFinite(raw)) return 3650;
  return Math.max(1, Math.min(36500, Math.floor(raw)));
}

async function seedTestAdmin() {
  const email = (process.env.TEST_ADMIN_EMAIL || 'saviosyl@gmail.com').trim().toLowerCase();
  const password = process.env.TEST_ADMIN_PASSWORD;
  const displayName = (process.env.TEST_ADMIN_DISPLAY_NAME || 'MetaMech Test Admin').trim();
  const role = (process.env.TEST_ADMIN_ROLE || 'admin').trim();
  const subscriptionDays = parseSubscriptionDays();
  const resetPassword = process.env.TEST_ADMIN_RESET_PASSWORD === 'true';

  if (!password) {
    throw new Error('Missing TEST_ADMIN_PASSWORD. Refusing to seed test admin without explicit password.');
  }

  const existing = await query(
    'SELECT id, display_name FROM users WHERE email = $1 LIMIT 1',
    [email]
  );

  const passwordHash = await bcrypt.hash(password, 12);
  let userId: number;

  if (existing.rows.length > 0) {
    userId = Number(existing.rows[0].id);
    await query(
      `UPDATE users
       SET role = $2,
           account_status = 'active',
           email_verified_at = COALESCE(email_verified_at, NOW()),
           trial_used_at = COALESCE(trial_used_at, NOW()),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId, role]
    );

    if (resetPassword) {
      await query(
        'UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId, passwordHash]
      );
    }

    console.log(`Updated existing test admin user: ${email} (id=${userId})`);
  } else {
    const inserted = await query(
      `INSERT INTO users (
         email, password_hash, display_name, role, account_status, email_verified_at, trial_used_at
       ) VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
       RETURNING id`,
      [email, passwordHash, displayName, role]
    );
    userId = Number(inserted.rows[0].id);
    console.log(`Created test admin user: ${email} (id=${userId})`);
  }

  const periodInterval = `${subscriptionDays} days`;
  await query(
    `INSERT INTO subscriptions (
       user_id, status, plan_code, current_period_start, current_period_end,
       cancel_at_period_end, trial_started_at, trial_ends_at
     ) VALUES (
       $1, 'active', 'admin-test', NOW(), NOW() + ($2)::interval,
       false, NULL, NULL
     )
     ON CONFLICT (user_id) DO UPDATE SET
       status = 'active',
       plan_code = 'admin-test',
       current_period_start = NOW(),
       current_period_end = NOW() + ($2)::interval,
       cancel_at_period_end = false,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, periodInterval]
  );

  console.log(`Ensured active subscription for ${email} (${subscriptionDays} days).`);
  console.log('Test admin seed completed successfully.');
}

if (require.main === module) {
  seedTestAdmin()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Failed to seed test admin:', error);
      await pool.end();
      process.exit(1);
    });
}
