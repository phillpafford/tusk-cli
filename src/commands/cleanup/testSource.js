import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

/**
 * Removes all generated mock source data.
 * @param {Object} options 
 */
export async function cleanupTestSource(options) {
  const targetDir = path.join(process.cwd(), 'test/fixtures/source_db');
  const relTargetDir = path.relative(process.cwd(), targetDir);

  if (options.dryRun) {
    console.log(`[DRY RUN] Would remove directory: ${relTargetDir}`);
    return;
  }

  if (!fs.existsSync(targetDir)) {
    console.log('No test fixtures found to clean up.');
    return;
  }

  if (!options.force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await rl.question(`Are you sure you want to delete all test fixtures in ${relTargetDir}? (y/N): `);
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Cleanup cancelled.');
      return;
    }
  }

  try {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log(`Successfully cleaned up: ${relTargetDir}`);
  } catch (error) {
    throw new Error(`Failed to cleanup test source: ${error.message}`);
  }
}
