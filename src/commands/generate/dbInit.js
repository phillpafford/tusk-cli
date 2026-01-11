import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { safeWrite } from '../../utils/fileUtils.js';

/**
 * Generates the 000_init.sql file to create databases defined in tusk.yaml.
 * @param {Object} options 
 */
export async function generateDbInit(options) {
  const configPath = path.resolve(process.cwd(), 'tusk.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('tusk.yaml not found.');
  }

  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const databases = config.databases || [];
  
  const dbNames = [...new Set(databases.map(db => db.local_target_name))];
  
  let sqlContent = `-- @lock
-- Generated Database Initialization

`;
  dbNames.forEach(name => {
    // We use triple backslash to ensure one backslash makes it into the final file 
    // depending on how the template literal is being processed in this environment.
    // Or simpler: use a literal string if possible.
    sqlContent += `SELECT 'CREATE DATABASE ${name}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${name}') \\gexec\n`;
  });

  const outputPath = path.join(process.cwd(), 'infrastructure/volume-mounts/000_init.sql');

  if (options.dryRun) {
    console.log(`[DRY RUN] Would write database initialization SQL to ${path.relative(process.cwd(), outputPath)}`);
    return;
  }

  if (safeWrite(outputPath, sqlContent, options.force)) {
    console.log(`Successfully generated: ${path.relative(process.cwd(), outputPath)}`);
  }
}
