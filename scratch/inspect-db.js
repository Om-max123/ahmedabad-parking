0.
import { pool, query } from '../server/db.js';

async function main() {
  try {
    const res = await query(`SELECT * FROM wallet_transactions;`);
    console.log('Wallet Transactions:', res.rows);
  } catch (err) {
    console.error('Check error:', err);
  } finally {
    await pool.end();
  }
}

main();
