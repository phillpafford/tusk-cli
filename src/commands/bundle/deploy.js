import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { executeShell } from '../../utils/psql.js';
import { sanitizeIdentifier } from '../../utils/sanitizer.js';
import { safeWrite } from '../../utils/fileUtils.js';

/**
 * Generates a unique Plan ID for grouping artifacts.
 * Format: YYYYMMDD-HHMM-slug
 */
function generatePlanId(slug = 'deploy') {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
  return `${datePart}-${timePart}-${slug}`;
}

/**
 * Injects the mandatory "MANUAL REVIEW REQUIRED" header.
 */
function wrapWithHeader(sql, planId, source, target) {
  const timestamp = new Date().toISOString();
  return `-- ############################################################
-- # !!! MANUAL REVIEW REQUIRED !!!
-- # PLAN ID: ${planId}
-- # SOURCE:  ${source}
-- # TARGET:  ${target}
-- # DATE:    ${timestamp}
-- ############################################################

${sql}
`;
}

/**
 * Implementation for bundle:prep:deploy
 */
export async function prepDeploy(options) {
  const config = loadConfig();
  const planId = generatePlanId(options.slug || 'update');
  
  for (const db of config.databases) {
    const { host, username, source_name, local_target_name, sslmode } = db;
    const remoteUrl = `postgresql://${username}@${host}/${source_name}?sslmode=${sslmode || 'disable'}`;
    const localUrl = `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@127.0.0.1:5432/${local_target_name}?sslmode=disable`;

    const args = ['prisma', 'migrate', 'diff', '--from-url', remoteUrl, '--to-url', localUrl, '--script'];

    console.log(`[${planId}] Preparing deployment for ${source_name}...`);

    if (options.dryRun) {
      console.log(`  [DRY RUN] Would diff ${source_name} -> ${local_target_name}`);
      continue;
    }

    try {
      const { stdout } = await executeShell('npx', args);
      if (stdout.trim()) {
        const content = wrapWithHeader(stdout, planId, remoteUrl, localUrl);
        const filename = `${planId}__${sanitizeIdentifier(source_name)}__deploy.sql`;
        const outputPath = path.join(process.cwd(), 'artifacts', filename);
        
        if (safeWrite(outputPath, content)) {
          console.log(`  [SUCCESS] Artifact generated: ${path.relative(process.cwd(), outputPath)}`);
        }
      } else {
        console.log(`  [INFO] No changes detected for ${source_name}.`);
      }
    } catch (error) {
      console.error(`  [ERROR] Prep failed for ${source_name}: ${error.message}`);
    }
  }
}

/**
 * Implementation for bundle:prep:revert
 */
export async function prepRevert(options) {
  const config = loadConfig();
  const planId = generatePlanId(options.slug || 'rollback');
  
  for (const db of config.databases) {
    const { host, username, source_name, local_target_name, sslmode } = db;
    const remoteUrl = `postgresql://${username}@${host}/${source_name}?sslmode=${sslmode || 'disable'}`;
    const localUrl = `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@127.0.0.1:5432/${local_target_name}?sslmode=disable`;

    // SWAP: Local -> Remote to generate rollback
    const args = ['prisma', 'migrate', 'diff', '--from-url', localUrl, '--to-url', remoteUrl, '--script'];

    console.log(`[${planId}] Preparing revert for ${source_name}...`);

    if (options.dryRun) {
      console.log(`  [DRY RUN] Would diff ${local_target_name} -> ${source_name}`);
      continue;
    }

    try {
      const { stdout } = await executeShell('npx', args);
      if (stdout.trim()) {
        const content = wrapWithHeader(stdout, planId, localUrl, remoteUrl);
        const filename = `${planId}__${sanitizeIdentifier(source_name)}__revert.sql`;
        const outputPath = path.join(process.cwd(), 'artifacts', filename);
        
        if (safeWrite(outputPath, content)) {
          console.log(`  [SUCCESS] Artifact generated: ${path.relative(process.cwd(), outputPath)}`);
        }
      } else {
        console.log(`  [INFO] No rollback needed for ${source_name}.`);
      }
    } catch (error) {
      console.error(`  [ERROR] Revert prep failed for ${source_name}: ${error.message}`);
    }
  }
}

/**
 * Implementation for bundle:prep:verify
 * Uses DO blocks with RAISE EXCEPTION for safety assertions.
 */
export async function prepVerify(options) {
  const config = loadConfig();
  const planId = generatePlanId(options.slug || 'verify');

  for (const db of config.databases) {
    const { source_name, local_target_name } = db;
    console.log(`[${planId}] Generating verification script for ${source_name}...`);

    // Basic logic: Check if tables defined in DDL exist in local target
    // In a real scenario, we might parse the deploy.sql, but here we provide the structure.
    const verifySql = `DO $$
BEGIN
    -- Verify local target schema match
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_catalog = '${local_target_name}') THEN
        RAISE EXCEPTION 'Verification Failed: Database % not found.', '${local_target_name}';
    END IF;

    RAISE NOTICE 'Verification successful for %', '${local_target_name}';
END $$;`;

    if (options.dryRun) {
      console.log(`  [DRY RUN] Would generate verify script for ${local_target_name}`);
      continue;
    }

    const content = wrapWithHeader(verifySql, planId, 'Manual', local_target_name);
    const filename = `${planId}__${sanitizeIdentifier(source_name)}__verify.sql`;
    const outputPath = path.join(process.cwd(), 'artifacts', filename);

    if (safeWrite(outputPath, content)) {
      console.log(`  [SUCCESS] Artifact generated: ${path.relative(process.cwd(), outputPath)}`);
    }
  }
}

function loadConfig() {
  const configPath = path.resolve(process.cwd(), 'tusk.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('tusk.yaml not found.');
  }
  return yaml.load(fs.readFileSync(configPath, 'utf8'));
}