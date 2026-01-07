import * as fs from 'fs';
import * as path from 'path';
import { pool, closePool } from '../../config/pg-pool';
import { createLogger } from '../../common/logger';

const logger = createLogger('migrations');

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname);
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  logger.info({ count: files.length }, 'Found migration files');

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    logger.info({ file }, 'Running migration');
    
    try {
      await pool.query(sql);
      logger.info({ file }, 'Migration completed successfully');
    } catch (error) {
      logger.error({ file, error: (error as Error).message }, 'Migration failed');
      throw error;
    }
  }

  logger.info('All migrations completed');
}

async function main(): Promise<void> {
  try {
    await runMigrations();
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Migration runner failed');
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
