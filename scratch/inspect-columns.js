import { pool, query } from '../server/db.js';

async function main() {
  try {
    const res = await query(`
      SELECT table_name, column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name IN ('users', 'bookings', 'wallet_transactions', 'vehicle_owners')
      ORDER BY table_name, ordinal_position;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Inspect error:', err);
  } finally {
    await pool.end();
  }
}

main();
