import path from 'node:path';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { safeWrite } from '../../utils/fileUtils.js';
import { sanitizeIdentifier } from '../../utils/sanitizer.js';

/**
 * Generates an example CSV configuration.
 * @param {Object} options 
 */
export async function generateConfigCSV(options) {
  const filePath = path.resolve(process.cwd(), 'templates/csv/example.csv');
  const relPath = path.relative(process.cwd(), filePath);
  const content = `id,name,email
1,John Doe,john@example.com
2,Jane Smith,jane@example.com
`;

  if (options.dryRun) {
    console.log(`[DRY RUN] Would write example CSV to ${relPath}`);
    return;
  }

  if (safeWrite(filePath, content)) {
    console.log(`Successfully generated example CSV: ${relPath}`);
  }
}

/**
 * Generates an example Faker YAML configuration.
 * @param {Object} options 
 */
export async function generateConfigFaker(options) {
  const filePath = path.resolve(process.cwd(), 'templates/faker/example_faker.yaml');
  return generateFakerScaffold(filePath, 'example_table', options);
}

/**
 * Internal helper to generate a Faker scaffold.
 */
export function generateFakerScaffold(filePath, table, options = {}) {
  const content = `columns:
  # Auto-generated scaffold for ${table}
  # Edit these to match your schema!
  # Reference: https://fakerjs.dev/api/
  id: number.int
  name: person.fullName
  email: internet.email
  created_at: date.past
`;

  const relPath = path.relative(process.cwd(), filePath);
  if (options.dryRun) {
    console.log(`[DRY RUN] Would write Faker scaffold to ${relPath}`);
    return true;
  }

  if (safeWrite(filePath, content, options.force)) {
    console.log(`Successfully generated Faker scaffold: ${relPath}`);
    return true;
  }
  return false;
}

/**
 * Generates an example custom SQL query configuration.
 * @param {Object} options 
 */
export async function generateConfigQuery(options) {
  const table = options.table || 'example_table';
  const sanitizedTable = sanitizeIdentifier(table.includes('.') ? table.split('.')[1] : table);
  const filePath = path.resolve(process.cwd(), `templates/queries/${sanitizedTable}.sql`);
  const relPath = path.relative(process.cwd(), filePath);

  let database = 'local_db';
  let schema = 'public';

  // Attempt to find context from tusk.yaml
  const configPath = path.resolve(process.cwd(), 'tusk.yaml');
  if (fs.existsSync(configPath)) {
    try {
      const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
      const dbMatch = config.databases?.find(db => 
        db.seed_tables?.some(t => {
          const configTable = t.table;
          // Match if exact, or if the config has schema but user provided just table, or vice versa
          return configTable === table || 
                 configTable.endsWith(`.${table}`) || 
                 table.endsWith(`.${configTable}`);
        })
      );
      if (dbMatch) {
        database = dbMatch.local_target_name;
      }
    } catch (e) {
      // Fallback to defaults
    }
  }

  const content = `-- @database ${database}
-- @schema ${schema}
-- @table ${sanitizedTable}
-- @lock (Remove this tag to allow Tusk to overwrite this file)

SELECT * FROM ${table} LIMIT 100;
`;

  if (options.dryRun) {
    console.log(`[DRY RUN] Would write query scaffold to ${relPath}`);
    return;
  }

  if (safeWrite(filePath, content, options.force)) {
    console.log(`Successfully generated query scaffold: ${relPath}`);
  }
}

/**
 * Resets tusk.yaml to its default architectural state.
 * @param {Object} options 
 */
export async function generateConfigReset(options) {
  const filePath = path.resolve(process.cwd(), 'tusk.yaml');
  const relPath = path.relative(process.cwd(), filePath);
  const content = `# Tusk CLI Configuration (v2.0 Schema)
# This default configuration targets the 'postgres-remote-local-demo' project.
# See: https://github.com/phillpafford/postgres-remote-local-demo

# Global Dependency Versions
dependency_versions:
  prisma: "5.13.0"
  mermaid: "10.9.0"

# Faker Configuration Map
faker_configs:
  authors_faker_config: "./templates/faker/authors.yaml"

databases:
  - source_name: "remote_example"     # The source DB (Port 5433 in demo)
    local_target_name: "local_db"     # The local Docker DB (Port 5432)
    host: "fake-remote-db.local:5433"
    username: "remote_user"
    sslmode: "disable"
    seed_tables:
      - table: "bookstore_ops.authors"
        method: "faker"
        faker_config_ref: "authors_faker_config"
        rows: 50
      - table: "bookstore_ops.books"
        method: "dump"
`;

  if (options.dryRun) {
    console.log(`[DRY RUN] Would reset ${relPath} to default state.`);
    return;
  }

    if (safeWrite(filePath, content, options.force)) {

      console.log(`Successfully reset configuration: ${relPath}`);

    }

  }

  

  /**

   * Appends a database configuration boilerplate to tusk.yaml.

   * @param {Object} options 

   */

  export async function generateConfigDB(options) {

    const filePath = path.resolve(process.cwd(), 'tusk.yaml');

    if (!fs.existsSync(filePath)) {

      throw new Error('tusk.yaml not found. Run "tusk init" first.');

    }

  

    const name = options.name || 'NewRemoteDB';

    const localName = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_db';

  

    const boilerplate = `

    - source_name: "${name}"

      local_target_name: "${localName}"

      host: "db.example.com:5432"

      username: "postgres"

      sslmode: "disable"

      seed_tables:

        - table: "public.users"

          method: "faker"

          faker_config_ref: "user_faker_config"

          rows: 100

        - table: "public.categories"

          method: "dump"

        - table: "public.orders"

          method: "query" # Uses templates/queries/orders.sql

  `;

  

    if (options.dryRun) {

      console.log(`[DRY RUN] Would append boilerplate for "${name}" to tusk.yaml`);

      console.log(boilerplate);

      return;

    }

  

    try {

      fs.appendFileSync(filePath, boilerplate, 'utf8');

      console.log(`Successfully appended "${name}" configuration to tusk.yaml`);

    } catch (error) {

      throw new Error(`Failed to update tusk.yaml: ${error.message}`);

    }

  }

  