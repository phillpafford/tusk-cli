#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { initProject } from '../src/commands/ops/init.js';
import { envCheck } from '../src/commands/ops/envCheck.js';
import { runSelfTest } from '../src/commands/ops/smokeTest.js';
import { generateDbInit } from '../src/commands/generate/dbInit.js';
import { generateDbDDL } from '../src/commands/generate/dbDDL.js';
import { generateDbSeed } from '../src/commands/generate/dbSeed.js';
import { generateDbQuery } from '../src/commands/generate/dbQuery.js';
import { generateDbReset } from '../src/commands/generate/dbReset.js';
import { 
  generateConfigCSV, 
  generateConfigFaker, 
  generateConfigQuery,
  generateConfigReset,
  generateConfigDB 
} from '../src/commands/generate/configScaffold.js';
import { dbDiff } from '../src/commands/ops/dbDiff.js';
import { dbSync } from '../src/commands/ops/dbSync.js';
import { dbCheck } from '../src/commands/ops/dbCheck.js';
import { 
  generateDiagramMMD, 
  generateDiagramRender 
} from '../src/commands/generate/diagrams.js';
import { 
  generateDemoTape, 
  generateDemoRender 
} from '../src/commands/generate/demos.js';
import { 
  prepDeploy, 
  prepRevert, 
  prepVerify 
} from '../src/commands/bundle/deploy.js';
import { 
  generateTestSource 
} from '../src/commands/generate/testSource.js';
import { 
  cleanupTestSource 
} from '../src/commands/cleanup/testSource.js';
import { 
  cleanupDbArtifacts 
} from '../src/commands/cleanup/dbArtifacts.js';
import { 
  cleanupDocsAll,
  cleanupDocsDiagram,
  cleanupDocsDemo 
} from '../src/commands/cleanup/docs.js';
import { getBrandingText } from '../src/utils/branding.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const program = new Command();
const isMaintainer = process.env.TUSK_CONTRIBUTE === 'true';

program
  .name('tusk')
  .description('Tusk CLI: Automate local PostgreSQL development environments')
  .version(pkg.version)
  .addHelpText('before', getBrandingText(pkg.version));

// --- 1. CORE / INIT ---
program
  .command('init')
  .description('Initialize a new Tusk project structure and configuration')
  .option('-f, --force', 'Overwrite existing configuration', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await initProject(options);
    } catch (error) {
      handleError(error);
    }
  });

// --- 2. OPS / HEALTH ---
program
  .command('ops:env:check')
  .description('Verify local development environment health')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      if (options.dryRun) {
        console.log('[DRY RUN] Would check environment health...');
        return;
      }
      await envCheck(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('ops:env:test', { hidden: !isMaintainer })
  .description('Execute a self-test by running all commands in dry-run mode')
  .action(async (options) => {
    try {
      await runSelfTest(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('ops:db:check')
  .description('Verify connectivity and permissions for remote sources')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await dbCheck(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('ops:db:diff')
  .description('Wrapper for prisma migrate diff')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await dbDiff(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('ops:db:sync')
  .description('Sync data using generated SQL templates')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await dbSync(options);
    } catch (error) {
      handleError(error);
    }
  });

// --- 3. GENERATE / SYNC ---
program
  .command('generate:db:init')
  .description('Generate the database creation script (000_init.sql)')
  .option('-f, --force', 'Overwrite locked init file', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDbInit(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:db:ddl')
  .description('Extract schema from remote databases and sanitize for local use')
  .option('-b, --database <name>', 'Process only a specific database from tusk.yaml')
  .option('-f, --force', 'Overwrite existing DDL artifacts', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDbDDL(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:db:seed')
  .description('Generate seed data for databases using various methods')
  .option('-f, --force', 'Overwrite existing seed artifacts', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDbSeed(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:db:query')
  .description('Execute a remote query and generate a local seed artifact')
  .option('-f, --file <filename>', 'The query template file in templates/queries/ (omitting this processes all files)')
  .option('-v, --verbose', 'Enable verbose logging for troubleshooting', false)
  .option('--force', 'Overwrite existing seed artifacts', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDbQuery(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:db:reset', { hidden: !isMaintainer })
  .description('Full contributor reset: Resets config, cleans artifacts, and re-scaffolds demo')
  .option('-f, --force', 'Force execution without confirmation', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDbReset(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:config:csv')
  .description('Generate an example CSV scaffold')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateConfigCSV(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:config:faker')
  .description('Generate an example Faker YAML scaffold')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateConfigFaker(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:config:query')
  .description('Generate an example custom SQL query scaffold')
  .option('-t, --table <name>', 'Target table name for the query')
  .option('-f, --force', 'Overwrite existing query scaffold', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateConfigQuery(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:config:db')
  .description('Append a new database configuration template to tusk.yaml')
  .option('-n, --name <name>', 'Source name for the new database', 'NewRemoteDB')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateConfigDB(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:config:reset', { hidden: !isMaintainer })
  .description('Reset tusk.yaml to its default state')
  .option('-f, --force', 'Overwrite existing config even if locked', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateConfigReset(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:diagram:mmd', { hidden: !isMaintainer })
  .description('Generate Mermaid source files for database architecture')
  .option('-f, --force', 'Overwrite locked diagram source files', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDiagramMMD(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:diagram:render', { hidden: !isMaintainer })
  .description('Render Mermaid files to PNG images')
  .option('-f, --force', 'Overwrite existing PNG diagrams', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDiagramRender(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:demo:tape', { hidden: !isMaintainer })
  .description('Generate VHS tape source files for usage demos')
  .option('-f, --force', 'Overwrite locked tape files', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDemoTape(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:demo:render', { hidden: !isMaintainer })
  .description('Render VHS tape files to GIFs')
  .option('-f, --force', 'Force render (overwrite existing GIFs)', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateDemoRender(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate:test:source', { hidden: !isMaintainer })
  .description('Generate a mock remote database suite for testing')
  .option('-c, --context <context>', 'Context description for the mock DB', 'General System')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await generateTestSource(options);
    } catch (error) {
      handleError(error);
    }
  });

// --- 4. BUNDLE / PREP ---
program
  .command('bundle:prep:deploy')
  .description('Generate a deployment plan artifact')
  .option('-s, --slug <slug>', 'Suffix for the Plan ID', 'update')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await prepDeploy(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('bundle:prep:revert')
  .description('Generate a revert/rollback artifact')
  .option('-s, --slug <slug>', 'Suffix for the Plan ID', 'rollback')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await prepRevert(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('bundle:prep:verify')
  .description('Generate a verification assertion artifact')
  .option('-s, --slug <slug>', 'Suffix for the Plan ID', 'verify')
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await prepVerify(options);
    } catch (error) {
      handleError(error);
    }
  });

// --- 5. CLEANUP ---
program
  .command('cleanup:db:artifacts', { hidden: !isMaintainer })
  .description('Remove all generated SQL artifacts (DDL, Seeds, Init)')
  .option('-f, --force', 'Force deletion without confirmation', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await cleanupDbArtifacts(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('cleanup:docs:all', { hidden: !isMaintainer })
  .description('Remove all generated documentation assets (MMD, PNG, Tapes, GIFs)')
  .option('-f, --force', 'Force deletion without confirmation', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await cleanupDocsAll(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('cleanup:docs:diagram', { hidden: !isMaintainer })
  .description('Remove only diagram assets (MMD, PNG)')
  .option('-f, --force', 'Force deletion without confirmation', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await cleanupDocsDiagram(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('cleanup:docs:demo', { hidden: !isMaintainer })
  .description('Remove only demo assets (Tapes, GIFs)')
  .option('-f, --force', 'Force deletion without confirmation', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await cleanupDocsDemo(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('cleanup:test:source', { hidden: !isMaintainer })
  .description('Remove all generated mock source data')
  .option('-f, --force', 'Force deletion without confirmation', false)
  .option('-d, --dry-run', 'Simulate execution', false)
  .action(async (options) => {
    try {
      await cleanupTestSource(options);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * Global Error Handler
 * @param {Error} error 
 */
function handleError(error) {
  console.error(`Error: ${error.message}`);
  
  if (process.env.DEBUG === 'true') {
    console.error(error.stack);
  }
  
  process.exit(1);
}

// Global Rejection Handler
process.on('unhandledRejection', (reason) => {
  handleError(reason instanceof Error ? reason : new Error(String(reason)));
});

// Execute CLI
try {
  program.parse(process.argv);
} catch (error) {
  handleError(error);
}