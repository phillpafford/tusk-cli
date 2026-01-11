import path from 'node:path';
import fs from 'node:fs';
import { executeShell } from '../../utils/psql.js';

/**
 * Syncs data using generated SQL templates (typically \copy commands).
 * @param {Object} options 
 */
export async function dbSync(options) {
  // We look for files with prefix 600 or specific table names
  // For this implementation, we will target the local_db defined in tusk.yaml
  // or a user-provided database.
  
  const ddlDir = path.join(process.cwd(), 'infrastructure/volume-mounts/ddl');
  if (!fs.existsSync(ddlDir)) {
    console.warn('DDL directory not found. Nothing to sync.');
    return;
  }

  // Find all 600__* files which are used for Custom SQL / CSV sync
  const files = fs.readdirSync(ddlDir)
    .filter(f => f.startsWith('600__') && f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No sync templates (600__*) found in infrastructure/volume-mounts/ddl/');
    return;
  }

  for (const file of files) {
    const filePath = path.join(ddlDir, file);
    const targetDb = file.split('__')[2]; // 3rd segment

    if (options.dryRun) {
      console.log(`[DRY RUN] Would execute ${file} against database ${targetDb}`);
      continue;
    }

    console.log(`Syncing ${file} to ${targetDb}...`);
    try {
      // Execute via psql. 
      // Use 127.0.0.1 to force IPv4 and avoid conflicts with local PG on ::1
      const args = [
        '--host', '127.0.0.1',
        '--username', process.env.POSTGRES_USER || 'postgres',
        '--dbname', targetDb,
        '--file', filePath
      ];
      
      await executeShell('psql', args);
    } catch (error) {
      console.error(`Sync failed for ${file}: ${error.message}`);
    }
  }
}
