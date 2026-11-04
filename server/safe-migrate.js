import { pool } from './db.js';

export async function applySafeDatabaseEnhancements() {
  console.log('[Migration] Checking and applying database integrity enhancements...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Safe column additions
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'driver';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 500.00;

      ALTER TABLE vehicle_owners ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE vehicle_owners ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending_official_verification';
      ALTER TABLE vehicle_owners ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
      ALTER TABLE vehicle_owners ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 500.00;

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_method VARCHAR(100) DEFAULT 'FASTag RFID';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_time TIMESTAMPTZ;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PAID_WALLET';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    `);

    // 2. Clean up any historical inconsistent duplicate active bookings before adding unique index
    // If a slot has multiple active bookings, keep the newest active and complete the older ones
    await client.query(`
      WITH ranked_active AS (
        SELECT booking_id, slot_id,
               ROW_NUMBER() OVER(PARTITION BY slot_id ORDER BY created_at DESC) as rn
        FROM bookings
        WHERE status = 'active'
      )
      UPDATE bookings
      SET status = 'completed', exit_time = CURRENT_TIMESTAMP
      WHERE booking_id IN (
        SELECT booking_id FROM ranked_active WHERE rn > 1
      );
    `);

    // Complete any active bookings where the parking slot has already been freed to available
    await client.query(`
      UPDATE bookings b
      SET status = 'completed', exit_time = CURRENT_TIMESTAMP
      FROM parking_slots s
      WHERE b.slot_id = s.id AND b.status = 'active' AND s.status = 'available';
    `);

    // Sync user_id on existing bookings if user_id is null but phone/plate matches users table
    await client.query(`
      UPDATE bookings b
      SET user_id = u.id
      FROM users u
      WHERE b.user_id IS NULL AND (b.phone = u.phone OR b.plate = u.car_number);
    `);

    // 3. Unique & Performance Indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot_booking 
      ON bookings (slot_id) WHERE status = 'active';

      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency 
      ON bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref ON wallet_transactions(reference_id);
      CREATE INDEX IF NOT EXISTS idx_slots_location ON parking_slots(location_id);
      CREATE INDEX IF NOT EXISTS idx_slots_status ON parking_slots(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_plate ON bookings(plate);
      CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    `);

    await client.query('COMMIT');
    console.log('[Migration] Database integrity enhancements successfully applied.');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration] Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// If executed directly
if (process.argv[1] && process.argv[1].endsWith('safe-migrate.js')) {
  applySafeDatabaseEnhancements()
    .then(() => pool.end())
    .catch((e) => { console.error(e); pool.end(); process.exit(1); });
}
