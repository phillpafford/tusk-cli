import { executeShell } from '../../utils/psql.js';

const COMMANDS = [
  '--help',
  'init',
  'ops:env:check',
  'ops:env:test',
  'generate:db:init',
  'generate:db:ddl',
  'generate:db:seed',
  'generate:db:query',
  'generate:config:csv',
  'generate:config:faker',
  'generate:config:query',
  'generate:config:db',
  'generate:config:reset',
  'ops:db:diff',
  'ops:db:sync',
  'ops:db:check',
  'generate:diagram:mmd',
  'generate:diagram:render',
  'generate:demo:tape',
  'generate:demo:render',
  'bundle:prep:deploy',
  'bundle:prep:revert',
  'bundle:prep:verify',
  'generate:test:source',
  'cleanup:test:source',
  'cleanup:db:artifacts',
  'cleanup:docs:all',
  'cleanup:docs:diagram',
  'cleanup:docs:demo'
];

/**
 * Executes a self-test by running all CLI commands in dry-run mode.
 * @param {Object} options 
 */
export async function runSelfTest(options) {
  console.log('🚀 Starting Tusk Environment Test (Smoke Test)...');
  console.log('-------------------------------------------');

  let passed = 0;
  let failed = 0;

  for (const cmd of COMMANDS) {
    process.stdout.write(`Testing: tusk ${cmd} --dry-run `);
    
    try {
      // We use 'node bin/tusk.js' to ensure we test the local code 
      // even if the global 'tusk' link is stale.
      await executeShell('node', ['bin/tusk.js', cmd, '--dry-run'], { 
        env: { TUSK_CONTRIBUTE: 'true' } 
      });
      
      console.log(' ✅ [PASS]');
      passed++;
    } catch (error) {
      console.log(' ❌ [FAIL]');
      console.error(`    Reason: ${error.message}`);
      failed++;
    }
  }

  console.log('-------------------------------------------');
  console.log(`Self-Test Summary: ${passed} passed, ${failed} failed.`);

  if (failed > 0) {
    process.exit(1);
  }
}
