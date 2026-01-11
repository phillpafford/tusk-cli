-- @lock
-- Generated Database Initialization

SELECT 'CREATE DATABASE local_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'local_db') \gexec
