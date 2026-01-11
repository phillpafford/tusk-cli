import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { executeShell } from '../../utils/psql.js';

/**
 * Verifies connectivity and permissions for remote sources.
 * @param {Object} options 
 */
export async function dbCheck(options) {
  const configPath = path.resolve(process.cwd(), 'tusk.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('tusk.yaml not found.');
  }

  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const databases = config.databases || [];

  for (const db of databases) {
    const { host, username, source_name, sslmode } = db;
    console.log(`Checking connectivity for ${source_name} (${host})...`);

    // Use source_name as the database name. 
    // If it's just an alias, this might fail, but it's more likely to match .pgpass
    // than the hardcoded 'postgres'.
    const connectionString = `postgresql://${username}@${host}/${source_name}?sslmode=${sslmode || 'disable'}`;

    if (options.dryRun) {
      console.log(`[DRY RUN] Would verify connection and privileges for ${host}`);
      continue;
    }

    try {
      // 1. Connectivity check: SELECT 1
      await executeShell('psql', ['--dbname', connectionString, '--command', 'SELECT 1']);
      console.log(`  [OK] Connection established.`);

      // 2. Verify pg_dump privileges
      // A common way to check if someone can dump is to see if they can select from a catalog table
      // or check their roles. We'll run a simple check on pg_catalog.pg_class.
      await executeShell('psql', ['--dbname', connectionString, '--command', 'SELECT count(*) FROM pg_catalog.pg_class LIMIT 1']);
      console.log(`  [OK] Privileges verified for metadata extraction.`);

    } catch (error) {
      console.error(`  [FAIL] Connectivity/Privilege check failed for ${source_name}: ${error.message}`);
    }
  }
}
