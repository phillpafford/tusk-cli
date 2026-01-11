import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

/**
 * Removes all generated SQL artifacts (DDL, Seeds, Init scripts) and resets templates.
 * @param {Object} options 
 */
export async function cleanupDbArtifacts(options) {
  const ddlDir = path.join(process.cwd(), 'infrastructure/volume-mounts/ddl');
  const initSql = path.join(process.cwd(), 'infrastructure/volume-mounts/000_init.sql');
  const templateDirs = [
    path.join(process.cwd(), 'templates/faker'),
    path.join(process.cwd(), 'templates/queries'),
    path.join(process.cwd(), 'templates/csv'),
    path.join(process.cwd(), 'docs/diagrams'),
    path.join(process.cwd(), 'docs/demos/tapes'),
    path.join(process.cwd(), 'docs/demos/gifs')
  ];
  
  const relDdlDir = path.relative(process.cwd(), ddlDir);
  const relInitSql = path.relative(process.cwd(), initSql);

  if (options.dryRun) {
    console.log(`[DRY RUN] Would remove all SQL files in ${relDdlDir}`);
    console.log(`[DRY RUN] Would remove ${relInitSql}`);
    templateDirs.forEach(dir => {
      console.log(`[DRY RUN] Would clear contents of ${path.relative(process.cwd(), dir)}`);
    });
    return;
  }

  if (!options.force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await rl.question('Are you sure you want to delete all generated SQL artifacts and reset templates? (y/N): ');
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Cleanup cancelled.');
      return;
    }
  }

  // 1. Clear DDL directory (except .gitkeep)
  clearDirectory(ddlDir);

  // 2. Clear Template directories (except .gitkeep)
  templateDirs.forEach(dir => clearDirectory(dir));

  // 3. Remove init script
  if (fs.existsSync(initSql)) {
    fs.unlinkSync(initSql);
    console.log(`Removed ${relInitSql}`);
  }

  console.log('Database artifacts and templates cleaned successfully.');
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