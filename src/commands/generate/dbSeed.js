import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { faker } from '@faker-js/faker';
import { executeShell } from '../../utils/psql.js';
import { sanitizeIdentifier } from '../../utils/sanitizer.js';
import { safeWrite } from '../../utils/fileUtils.js';
import { formatValue } from '../../utils/sqlUtils.js';
import { generateFakerScaffold } from './configScaffold.js';

/**
 * Traverses the faker object based on a dot-notated path.
 */
function getFakerValue(fakerPath) {
  const parts = fakerPath.split('.');
  let fn = faker;
  for (const part of parts) {
    if (fn && fn[part]) {
      fn = fn[part];
    } else {
      return null;
    }
  }
  return typeof fn === 'function' ? fn() : fn;
}

/**
 * Main command implementation for generating seed data.
 */
export async function generateDbSeed(options) {
  const configPath = path.resolve(process.cwd(), 'tusk.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found at ${configPath}`);
  }

  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const databases = config.databases || [];
  const fakerConfigs = config.faker_configs || {};

  // Counters to maintain order across all databases
  let dumpCount = 0;
  let queryCount = 0;
  let fakerCount = 0;

  for (const db of databases) {
    const { host, username, source_name, local_target_name, sslmode, seed_tables } = db;
    if (!seed_tables) continue;

    const sanitizedHost = sanitizeIdentifier(host);
    const sanitizedLocalTarget = sanitizeIdentifier(local_target_name);

    for (const seed of seed_tables) {
      const { table, method, rows, faker_config_ref } = seed;
      let prefix = '';
      let sqlContent = '';

      console.log(`Generating seed for ${table} using ${method}...`);

      try {
        if (method === 'dump') {
          prefix = (400 + dumpCount).toString().padStart(3, '0');
          sqlContent = await handleDump(db, table, options);
          dumpCount++;
        } else if (method === 'faker') {
          prefix = (800 + fakerCount).toString().padStart(3, '0');
          const fakerConfigPath = fakerConfigs[faker_config_ref];
          sqlContent = await handleFaker(table, rows, fakerConfigPath, options);
          fakerCount++;
        } else if (method === 'query') {
          prefix = (600 + queryCount).toString().padStart(3, '0');
          sqlContent = await handleQuery(table, options);
          queryCount++;
        } else if (method === 'csv') {
          prefix = (600 + queryCount).toString().padStart(3, '0');
          sqlContent = await handleCSV(db, table, options);
          queryCount++;
        } else {
          console.warn(`Unknown seeding method: ${method}`);
          continue;
        }

        if (sqlContent) {
          const sanitizedTable = sanitizeIdentifier(table);
          const filename = `${prefix}__${sanitizedHost}__${sanitizedLocalTarget}__${sanitizedTable}.sql`;
          const outputPath = path.join(process.cwd(), 'infrastructure/volume-mounts/ddl', filename);

          const relativeOutputPath = path.relative(process.cwd(), outputPath);
          if (options.dryRun) {
            console.log(`[DRY RUN] Would write seed file to ${relativeOutputPath}`);
          } else {
            safeWrite(outputPath, sqlContent, options.force);
            console.log(`Successfully wrote seed to ${relativeOutputPath}`);
          }
        }
      } catch (error) {
        console.error(`Failed to generate seed for ${table}: ${error.message}`);
      }
    }
  }
}

async function handleDump(db, table, options) {
  const { host, username, source_name, sslmode } = db;
  const connectionString = `postgresql://${username}@${host}/${source_name}?sslmode=${sslmode || 'disable'}`;
  
  // Use --inserts to get INSERT statements instead of COPY
  // Use --column-inserts if you want explicit column names in every statement
  const args = ['-a', '-t', table, '--inserts', '--no-owner', '--no-privileges', '--dbname', connectionString];
  
  if (options.dryRun) {
    return `-- [DRY RUN] pg_dump -a -t ${table} --inserts ...`;
  }

  const { stdout } = await executeShell('pg_dump', args);
  return `SET session_replication_role = 'replica';\n${stdout}\nSET session_replication_role = 'origin';`;
}

async function handleFaker(table, rows, fakerConfigPath, options) {
  if (!fakerConfigPath) {
    throw new Error(`Faker config path not found for table ${table}`);
  }

  const fullPath = path.resolve(process.cwd(), fakerConfigPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  [INFO] Faker config missing for ${table}. Attempting to generate scaffold...`);
    if (!generateFakerScaffold(fullPath, table, options)) {
      throw new Error(`Failed to generate automated scaffold at ${fullPath}`);
    }
    // If it was a dry run, we stop here as the file wasn't actually created
    if (options.dryRun) return '';
  }

  const fakerDef = yaml.load(fs.readFileSync(fullPath, 'utf8'));
  const columns = fakerDef.columns;
  if (!columns) {
    throw new Error(`Invalid faker config at ${fullPath}: 'columns' missing`);
  }

  const rowCount = rows || 10;
  const colNames = Object.keys(columns);
  const insertStatements = [];

  for (let i = 0; i < rowCount; i++) {
    const vals = colNames.map(col => formatValue(getFakerValue(columns[col])));
    insertStatements.push(`INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${vals.join(', ')});`);
  }
  
  return `-- Seed data for ${table} via Faker (${rowCount} rows)
SET session_replication_role = 'replica';
${insertStatements.join('\n')}
SET session_replication_role = 'origin';
`;
}

async function handleQuery(table, options) {
  const sanitizedTable = sanitizeIdentifier(table);
  const queryPath = path.join(process.cwd(), 'templates/queries', `${sanitizedTable}.sql`);
  
  if (!fs.existsSync(queryPath)) {
    console.warn(`Warning: Query file not found at ${queryPath}`);
    return '';
  }

  return fs.readFileSync(queryPath, 'utf8');
}

async function handleCSV(db, table, options) {
  const [schema, tableName] = table.includes('.') ? table.split('.') : ['public', table];
  return `\copy ${schema}.${tableName} FROM 'templates/csv/${tableName}.csv' WITH (FORMAT csv, HEADER true);
`;
}
