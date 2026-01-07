#!/bin/bash
set -e

echo "PostgreSQL initialization script running..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
    
    SELECT 'Database initialized successfully' AS status;
EOSQL

echo "PostgreSQL initialization complete."
