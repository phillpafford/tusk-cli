import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { executeShell } from '../../utils/psql.js';
import { safeWrite } from '../../utils/fileUtils.js';
import { sanitizeIdentifier } from '../../utils/sanitizer.js';
import { formatValue } from '../../utils/sqlUtils.js';

/**
 * Executes remote queries and saves the results as seed scripts.
 * @param {Object} options 
 */
export async function generateDbQuery(options) {
  const queriesDir = path.resolve(process.cwd(), 'templates/queries');
  
  if (!fs.existsSync(queriesDir)) {
    throw new Error(`Queries directory not found at ${queriesDir}`);
  }

  // Determine which files to process
  const queryFiles = options.file 
    ? [options.file] 
    : fs.readdirSync(queriesDir).filter(f => f.endsWith('.sql'));

  if (queryFiles.length === 0) {
    console.log('No query files found to process.');
    return;
  }

  const config = yaml.load(fs.readFileSync(path.resolve(process.cwd(), 'tusk.yaml'), 'utf8'));

  for (const queryFile of queryFiles) {
    const queryPath = path.join(queriesDir, queryFile);
    console.log(`\n--- Processing Query: ${queryFile} ---`);

    try {
      const rawContent = fs.readFileSync(queryPath, 'utf8');
      
      // Parse metadata from headers
      const database = rawContent.match(/-- @database\s+(.+)/)?.[1]?.trim();
      const schema = rawContent.match(/-- @schema\s+(.+)/)?.[1]?.trim() || 'public';
      const table = rawContent.match(/-- @table\s+(.+)/)?.[1]?.trim();

      if (!database || !table) {
        console.warn(`  [SKIP] ${queryFile}: Missing -- @database or -- @table headers.`);
        continue;
      }

      // Find connection info
      const dbConfig = config.databases.find(db => db.local_target_name === database || db.source_name === database);
      if (!dbConfig) {
        console.warn(`  [SKIP] No database configuration found for "${database}" in tusk.yaml`);
        continue;
      }

      const { host, username, source_name, sslmode, local_target_name } = dbConfig;
      
      // Connection Context Output
      console.log(`  Target Host: ${host}`);
      console.log(`  Source DB:   ${source_name}`);
      console.log(`  Local DB:    ${local_target_name}`);
      console.log(`  Target Tab:  ${schema}.${table}`);

      const connectionString = `postgresql://${username}@${host}/${source_name}?sslmode=${sslmode || 'disable'}`;
      
      // Extract the actual SQL and strip comments
      const sqlQuery = rawContent.split('\n')
        .map(line => {
          const commentIndex = line.indexOf('--');
          return commentIndex !== -1 ? line.substring(0, commentIndex) : line;
        })
        .join(' ')
        .replace(/;/g, '')
        .trim();

      if (options.dryRun) {
        const sanitizedHost = sanitizeIdentifier(host);
        console.log(`  [DRY RUN] Would execute query on ${host} and save to 600__${sanitizedHost}__${local_target_name}__${table}.sql`);
        continue;
      }

      if (options.verbose) {
        console.log(`  [VERBOSE] SQL: ${sqlQuery}`);
      }

      // Execute remote query using JSON output for robustness
      // Wrap query in row_to_json to handle commas/quotes correctly
      const jsonCommand = `SELECT row_to_json(t) FROM (${sqlQuery}) t`;
      
      try {
        const { stdout, stderr } = await executeShell('psql', [
          '--dbname', connectionString, 
          '--tuples-only', 
          '--no-align', 
          '--command', jsonCommand
        ]);
        
        if (options.verbose && stderr) {
          console.log(`  [VERBOSE] Stderr: ${stderr}`);
        }

        const lines = stdout.trim().split('\n').filter(l => l.trim());
        if (lines.length === 0) {
          console.warn(`  [WARN] Query returned no data.`);
          continue;
        }

        const insertStatements = lines.map(line => {
          try {
            const row = JSON.parse(line);
            const colNames = Object.keys(row).map(c => `"${c}"`);
            const values = Object.values(row).map(v => formatValue(v));
            return `INSERT INTO ${schema}."${table}" (${colNames.join(', ')}) VALUES (${values.join(', ')});`;
          } catch (e) {
            if (options.verbose) console.error(`  [VERBOSE] Failed to parse JSON line: ${line}`);
            return `-- Failed to parse row: ${line}`;
          }
        });

        // Calculate prefix based on global index of queries/csvs in tusk.yaml
        let queryIndex = 0;
        config.databases.forEach(d => {
          d.seed_tables?.forEach(t => {
            if (t.method === 'query' || t.method === 'csv') {
              if (t.table === table || t.table.endsWith(`.${table}`)) {
                // Found our index
              } else {
                queryIndex++;
              }
            }
          });
        });

        const prefix = (600 + queryIndex).toString().padStart(3, '0');
        const sanitizedHost = sanitizeIdentifier(host);
        const filename = `${prefix}__${sanitizedHost}__${local_target_name}__${table}.sql`;
        const outputPath = path.join(process.cwd(), 'infrastructure/volume-mounts/ddl', filename);

        const localScript = `-- Generated from remote query: ${queryFile}
-- @table ${table}

SET session_replication_role = 'replica';

${insertStatements.join('\n')}

SET session_replication_role = 'origin';
`;

        const relativeOutputPath = path.relative(process.cwd(), outputPath);
        if (safeWrite(outputPath, localScript.trim() + '\n', options.force)) {
          console.log(`  [SUCCESS] Artifact generated: ${relativeOutputPath}`);
        }
      } catch (error) {
        console.error(`  [ERROR] Remote query failed for ${queryFile}`);
        if (options.verbose) {
          console.error(`  [VERBOSE] Details: ${error.message}`);
          if (error.stderr) console.error(`  [VERBOSE] PSQL Stderr: ${error.stderr}`);
        } else {
          console.error(`  [TIP] Run with --verbose to see full error details.`);
        }
      }

    } catch (error) {
      console.error(`  [ERROR] Critical error processing ${queryFile}: ${error.message}`);
    }
  }
}
