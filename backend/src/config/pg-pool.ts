import { Pool, PoolConfig, QueryResult, QueryResultRow, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import { createLogger } from '../common/logger';

dotenv.config();

const logger = createLogger('pg-pool');

const getPoolConfig = (): PoolConfig => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'rkroots',
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  };
};

export const pool = new Pool(getPoolConfig());

pool.on('connect', () => {
  logger.debug('New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  logger.error({ error: err.message }, 'Unexpected error on idle PostgreSQL client');
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug({ query: text, duration, rows: result.rowCount }, 'Query executed');
    return result;
  } catch (error) {
    logger.error({ query: text, error: (error as Error).message }, 'Query failed');
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  const release = client.release.bind(client);

  const timeout = setTimeout(() => {
    logger.error('Client has been checked out for more than 5 seconds');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('PostgreSQL pool closed');
}
