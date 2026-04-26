# PostgreSQL (psql) — Cheat Sheet

> **Path:** `C:\Program Files\PostgreSQL\18\bin\psql.exe`  
> **Shell Script:** `C:\Program Files\PostgreSQL\18\scripts\runpsql.bat` (Start Menu: "SQL Shell (psql)")  
> **Version:** PostgreSQL 18.0  
> **Type:** Relational database CLI  
> **AegisForge Role:** Data persistence, analytics, potential backend for trading engine  
> **Companion Tools:** pg_dump, pg_restore, createdb, dropdb, pg_isready, pgbench

---

## Connecting

```bash
# Connect to database
psql -U postgres                           # Connect as postgres user (local)
psql -U postgres -d mydb                   # Connect to specific database
psql -h localhost -p 5432 -U user -d mydb  # Full connection string
psql "postgresql://user:pass@localhost:5432/mydb"   # Connection URI

# Connection parameters
# -h  host (default: localhost)
# -p  port (default: 5432)
# -U  username
# -d  database name
# -W  force password prompt

# Quick health check (no interactive session)
pg_isready                                 # Check if PostgreSQL is accepting connections
pg_isready -h localhost -p 5432
```

---

## psql Meta-Commands (backslash commands)

These only work inside the psql interactive session. They start with `\`.

```sql
-- Navigation
\l                     -- List all databases
\c dbname              -- Connect to (switch to) a database
\dt                    -- List tables in current database
\dt+                   -- List tables with sizes
\d tablename           -- Describe table structure (columns, types, constraints)
\d+ tablename          -- Detailed table info (with storage, stats)
\di                    -- List indexes
\dv                    -- List views
\df                    -- List functions
\du                    -- List users/roles
\dn                    -- List schemas
\ds                    -- List sequences

-- Display
\x                     -- Toggle expanded display (vertical vs horizontal)
\x auto                -- Auto-switch based on width
\pset format wrapped   -- Wrapped output for wide tables
\pset border 2         -- Box-style borders

-- Output
\o output.txt          -- Send query results to file
\o                     -- Stop sending to file
\copy                  -- Client-side COPY (no server file access needed)

-- Execution
\i script.sql          -- Execute SQL file
\timing                -- Toggle query execution timing
\watch 5               -- Re-run last query every 5 seconds

-- Help
\?                     -- psql command help
\h SELECT              -- SQL command syntax help
\h CREATE TABLE        -- Help for specific SQL command

-- Exit
\q                     -- Quit psql
```

---

## SQL Quick Reference

### Database Operations

```sql
-- Create/Drop database
CREATE DATABASE aegisforge;
DROP DATABASE IF EXISTS aegisforge;

-- Create/Drop user
CREATE USER aegis WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE aegisforge TO aegis;
ALTER USER aegis WITH SUPERUSER;  -- (careful!)

-- From command line (not inside psql)
-- createdb -U postgres aegisforge
-- dropdb -U postgres aegisforge
```

### Table Operations

```sql
-- Create table
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(4) CHECK (side IN ('buy', 'sell')),
    price DECIMAL(18, 8) NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    strategy VARCHAR(50),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create index
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_executed ON trades(executed_at);
CREATE INDEX idx_trades_metadata ON trades USING GIN(metadata);  -- JSON index

-- Alter table
ALTER TABLE trades ADD COLUMN fee DECIMAL(18, 8) DEFAULT 0;
ALTER TABLE trades DROP COLUMN fee;
ALTER TABLE trades RENAME COLUMN metadata TO extra;
ALTER TABLE trades ALTER COLUMN quantity SET DEFAULT 0;

-- Drop table
DROP TABLE IF EXISTS trades CASCADE;
```

### CRUD Operations

```sql
-- INSERT
INSERT INTO trades (symbol, side, price, quantity, strategy)
VALUES ('BTC/USD', 'buy', 67500.00, 0.01, 'RSI');

INSERT INTO trades (symbol, side, price, quantity, strategy, metadata)
VALUES ('ETH/USD', 'sell', 3200.00, 1.5, 'MACD', '{"signal": "bearish_cross"}');

-- SELECT
SELECT * FROM trades;
SELECT symbol, price, quantity FROM trades WHERE side = 'buy';
SELECT * FROM trades WHERE price > 60000 ORDER BY executed_at DESC LIMIT 10;
SELECT * FROM trades WHERE metadata->>'signal' = 'bearish_cross';  -- JSON query
SELECT symbol, COUNT(*), AVG(price), SUM(quantity)
  FROM trades GROUP BY symbol ORDER BY COUNT(*) DESC;

-- UPDATE
UPDATE trades SET strategy = 'Bollinger' WHERE id = 5;
UPDATE trades SET price = price * 1.01 WHERE symbol = 'BTC/USD';

-- DELETE
DELETE FROM trades WHERE executed_at < NOW() - INTERVAL '30 days';
DELETE FROM trades WHERE id = 1;
```

### Advanced Queries

```sql
-- Window functions
SELECT symbol, price, executed_at,
       AVG(price) OVER (PARTITION BY symbol ORDER BY executed_at ROWS 20 PRECEDING) as ma_20
FROM trades;

-- CTEs (Common Table Expressions)
WITH daily_volume AS (
    SELECT DATE(executed_at) as day, symbol, SUM(quantity) as vol
    FROM trades
    GROUP BY DATE(executed_at), symbol
)
SELECT * FROM daily_volume WHERE vol > 100;

-- JSONB operations
SELECT metadata->'signal' FROM trades;                 -- Extract key
SELECT * FROM trades WHERE metadata ? 'signal';        -- Key exists?
SELECT * FROM trades WHERE metadata @> '{"signal":"bearish_cross"}';  -- Contains?
UPDATE trades SET metadata = metadata || '{"reviewed": true}';  -- Merge JSON

-- Upsert (INSERT or UPDATE on conflict)
INSERT INTO trades (symbol, side, price, quantity)
VALUES ('BTC/USD', 'buy', 67500, 0.01)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;
```

---

## Backup & Restore

```bash
# Backup
pg_dump -U postgres mydb > backup.sql                  # SQL dump
pg_dump -U postgres -Fc mydb > backup.dump             # Custom format (compressed)
pg_dump -U postgres -t trades mydb > trades_only.sql   # Single table
pg_dumpall -U postgres > all_databases.sql             # ALL databases

# Restore
psql -U postgres -d mydb < backup.sql                  # From SQL dump
pg_restore -U postgres -d mydb backup.dump             # From custom format
pg_restore -U postgres -d mydb -t trades backup.dump   # Single table

# Restore to new database
createdb -U postgres newdb
pg_restore -U postgres -d newdb backup.dump
```

---

## Performance & Monitoring

```sql
-- Explain query plan
EXPLAIN SELECT * FROM trades WHERE symbol = 'BTC/USD';
EXPLAIN ANALYZE SELECT * FROM trades WHERE symbol = 'BTC/USD';  -- Actually runs query

-- Active queries
SELECT pid, state, query, query_start FROM pg_stat_activity WHERE state != 'idle';

-- Kill a query
SELECT pg_cancel_backend(pid);              -- Graceful cancel
SELECT pg_terminate_backend(pid);           -- Force kill

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;

-- Database size
SELECT pg_size_pretty(pg_database_size('mydb'));

-- Index usage
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

```bash
# Benchmarking
pgbench -i -U postgres mydb                # Initialize benchmark tables
pgbench -U postgres -c 10 -j 2 -t 100 mydb  # Run benchmark (10 clients, 2 threads, 100 txns each)
```

---

## Configuration

```sql
-- Key settings (in postgresql.conf or via ALTER SYSTEM)
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;
SHOW data_directory;

ALTER SYSTEM SET max_connections = 200;     -- Requires restart
SELECT pg_reload_conf();                    -- Reload config without restart
```

---

## \copy — Import/Export Data

```sql
-- Export to CSV
\copy trades TO 'trades.csv' WITH CSV HEADER;

-- Import from CSV
\copy trades(symbol, side, price, quantity) FROM 'data.csv' WITH CSV HEADER;

-- Export specific query
\copy (SELECT * FROM trades WHERE symbol = 'BTC/USD') TO 'btc_trades.csv' WITH CSV HEADER;
```

---

## AegisForge Patterns

```sql
-- Create trading database
CREATE DATABASE aegisforge;
\c aegisforge

-- Trades table with JSON metadata
CREATE TABLE trades (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(4) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    strategy VARCHAR(50),
    signal_data JSONB,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signals table
CREATE TABLE signals (
    id BIGSERIAL PRIMARY KEY,
    strategy VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(4) NOT NULL,
    confidence DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily P&L view
CREATE VIEW daily_pnl AS
SELECT DATE(executed_at) as day,
       SUM(CASE WHEN side = 'sell' THEN price * quantity ELSE -price * quantity END) as pnl
FROM trades GROUP BY DATE(executed_at) ORDER BY day;
```
