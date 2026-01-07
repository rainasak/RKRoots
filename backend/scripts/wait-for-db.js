#!/usr/bin/env node

const { Pool } = require('pg');

const maxRetries = 30;
const retryInterval = 1000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'rkroots',
  connectionTimeoutMillis: 2000,
});

async function waitForDb() {
  console.log('Waiting for PostgreSQL to be ready...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('PostgreSQL is ready!');
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.log(`Attempt ${i + 1}/${maxRetries}: PostgreSQL not ready yet...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  
  console.error('PostgreSQL did not become ready in time');
  await pool.end();
  process.exit(1);
}

waitForDb();
