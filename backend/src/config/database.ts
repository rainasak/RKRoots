import { pool, query, transaction, closePool, getClient } from './pg-pool';

export { pool, query, transaction, closePool, getClient };

export async function initializeDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}
