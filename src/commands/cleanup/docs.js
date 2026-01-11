import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const DIAGRAM_DIRS = [path.join(process.cwd(), 'docs/diagrams')];
const DEMO_DIRS = [
  path.join(process.cwd(), 'docs/demos/tapes'),
  path.join(process.cwd(), 'docs/demos/gifs')
];

/**
 * Removes all generated documentation assets.
 */
export async function cleanupDocsAll(options) {
  return performCleanup([...DIAGRAM_DIRS, ...DEMO_DIRS], 'all documentation assets (MMD, PNG, Tapes, GIFs)', options);
}

/**
 * Removes only diagram assets.
 */
export async function cleanupDocsDiagram(options) {
  return performCleanup(DIAGRAM_DIRS, 'diagram assets (MMD, PNG)', options);
}

/**
 * Removes only demo assets.
 */
export async function cleanupDocsDemo(options) {
  return performCleanup(DEMO_DIRS, 'demo assets (Tapes, GIFs)', options);
}

/**
 * Internal orchestration for cleanup.
 */
async function performCleanup(dirs, label, options) {
  if (options.dryRun) {
    dirs.forEach(dir => {
      console.log(`[DRY RUN] Would clear contents of ${path.relative(process.cwd(), dir)}`);
    });
    return;
  }

  if (!options.force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await rl.question(`Are you sure you want to delete ${label}? (y/N): `);
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Cleanup cancelled.');
      return;
    }
  }

  dirs.forEach(dir => clearDirectory(dir));
  console.log(`Cleanup of ${label} completed successfully.`);
}

/**
 * Internal helper to clear a directory of all files except .gitkeep
 */
function clearDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    let count = 0;
    const relDirPath = path.relative(process.cwd(), dirPath);
    for (const file of files) {
      if (file === '.gitkeep') continue;
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      count++;
    }
    console.log(`Cleaned ${count} items from ${relDirPath}`);
  }
}