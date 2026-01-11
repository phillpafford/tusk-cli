import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { executeShell } from '../../utils/psql.js';
import { sanitizeIdentifier } from '../../utils/sanitizer.js';
import { safeWrite } from '../../utils/fileUtils.js';

const AWS_EXTENSIONS = [
  'aws_s3',
  'aws_lambda',
  'aws_ml',
  'pg_tle',
  'rds_tools',
  'apg_plan_mgmt'
];

const EXTENSION_PACKAGE_MAP = {
  'plperl': 'postgresql-plperl-16',
  'plpython3u': 'postgresql-plpython3-16',
  'pltcl': 'postgresql-pltcl-16',
  'postgis': 'postgresql-16-postgis-3',
  'pg_repack': 'postgresql-16-repack',
  'pg_cron': 'postgresql-16-cron',
  'pg_partman': 'postgresql-16-partman',
  'pgvector': 'postgresql-16-pgvector'
};

const EXTENSION_CONFIG_MAP = {
  'pg_stat_statements': 'pg_stat_statements',
  'pg_cron': 'pg_cron',
  'pg_partman_bgw': 'pg_partman_bgw'
};

/**
 * Generates DDL SQL files for databases defined in tusk.yaml.
 * @param {Object} options - Command options (e.g., dryRun, database).
 */
export async function generateDbDDL(options) {
  const configPath = path.resolve(process.cwd(), 'tusk.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found at ${configPath}`);
  }

  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  let databases = config.databases || [];
  
  // 1. Filter by database name if provided via CLI
  if (options.database) {
    databases = databases.filter(db => 
      db.source_name === options.database || db.local_target_name === options.database
    );
    if (databases.length === 0) {
      throw new Error(`No database found matching "${options.database}" in tusk.yaml`);
    }
  }

  const allRequiredPackages = new Set();
  const allRequiredConfigs = new Set();

  let dbIndex = 0;
  for (const db of databases) {
    const { host, username, source_name, local_target_name, sslmode, target_schemas } = db;
    const sanitizedHost = sanitizeIdentifier(host);
    const sanitizedLocalTarget = sanitizeIdentifier(local_target_name);
    
    // Increment prefix within the 200 range
    const prefix = (200 + dbIndex).toString().padStart(3, '0');
    // Filename segment uses 'all' or joined schemas for clarity
    const schemaLabel = target_schemas?.length > 0 ? target_schemas.join('_') : 'all';
    const filename = `${prefix}__${sanitizedHost}__${sanitizedLocalTarget}__${schemaLabel}.sql`;
    const outputPath = path.join(process.cwd(), 'infrastructure/volume-mounts/ddl', filename);

    console.log(`Extracting DDL from ${source_name} (${host})...`);
    if (target_schemas?.length > 0) {
      console.log(`  Target Schemas: ${target_schemas.join(', ')}`);
    }

    if (options.dryRun) {
      console.log(`[DRY RUN] Would run pg_dump for ${host} and save to ${path.relative(process.cwd(), outputPath)}`);
      dbIndex++;
      continue;
    }

    try {
      const connectionString = `postgresql://${username}@${host}/${source_name}?sslmode=${sslmode || 'disable'}`;
      const args = ['-s', '--no-owner', '--no-privileges', '--dbname', connectionString];

      // 2. Filter by schema if target_schemas is defined in tusk.yaml
      if (target_schemas && Array.isArray(target_schemas)) {
        target_schemas.forEach(schema => {
          args.push('-n', schema);
        });
      }
      
      const { stdout } = await executeShell('pg_dump', args);
      let sanitizedSql = stdout;

      // 1. Sanitize: Comment out AWS extensions
      AWS_EXTENSIONS.forEach(ext => {
        const createRegex = new RegExp(`^(CREATE EXTENSION (IF NOT EXISTS )?${ext}\b.*);`, 'gm');
        const commentRegex = new RegExp(`^(COMMENT ON EXTENSION ${ext}\b.*);`, 'gm');
        sanitizedSql = sanitizedSql.replace(createRegex, '-- $1;');
        sanitizedSql = sanitizedSql.replace(commentRegex, '-- $1;');
      });

      // Sanitize: Comment out Publications and Subscriptions (avoid WAL level warnings)
      sanitizedSql = sanitizedSql.replace(/^(CREATE PUBLICATION\b.*;)/gm, '-- $1');
      sanitizedSql = sanitizedSql.replace(/^(ALTER PUBLICATION\b.*;)/gm, '-- $1');
      sanitizedSql = sanitizedSql.replace(/^(CREATE SUBSCRIPTION\b.*;)/gm, '-- $1');
      sanitizedSql = sanitizedSql.replace(/^(ALTER SUBSCRIPTION\b.*;)/gm, '-- $1');

      // 2. Scan for extensions to populate requirements.txt and tusk.conf
      const extensionMatches = sanitizedSql.matchAll(/^CREATE EXTENSION (?:IF NOT EXISTS )?(\w+)/gm);
      for (const match of extensionMatches) {
        const extName = match[1];
        if (EXTENSION_PACKAGE_MAP[extName]) {
          allRequiredPackages.add(EXTENSION_PACKAGE_MAP[extName]);
        }
        if (EXTENSION_CONFIG_MAP[extName]) {
          allRequiredConfigs.add(EXTENSION_CONFIG_MAP[extName]);
        }
      }

      if (safeWrite(outputPath, sanitizedSql, options.force)) {
        console.log(`Successfully wrote DDL to ${path.relative(process.cwd(), outputPath)}`);
      }

    } catch (error) {
      console.error(`Failed to extract DDL for ${source_name}: ${error.message}`);
    }
    dbIndex++;
  }

  if (!options.dryRun) {
    updateBuildContext(allRequiredPackages, allRequiredConfigs);
  }
}

function updateBuildContext(packages, configs) {
  const buildContextDir = path.join(process.cwd(), 'infrastructure/build-context');
  
  if (packages.size > 0) {
    const reqPath = path.join(buildContextDir, 'requirements.txt');
    const content = Array.from(packages).join('\n') + '\n';
    fs.writeFileSync(reqPath, content, 'utf8');
    console.log(`Updated ${path.relative(process.cwd(), reqPath)}`);
  }

  if (configs.size > 0) {
    const confPath = path.join(buildContextDir, 'tusk.conf');
    const sharedLibs = Array.from(configs).join(',');
    const content = `shared_preload_libraries = '${sharedLibs}'\n`;
    fs.writeFileSync(confPath, content, 'utf8');
    console.log(`Updated ${path.relative(process.cwd(), confPath)}`);
  }
}