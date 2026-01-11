import fs from 'node:fs';
import path from 'node:path';
import { executeShell } from '../../utils/psql.js';
import { safeWrite } from '../../utils/fileUtils.js';

const CLI_COMMANDS = [
  'ops:env:check',
  'generate:db:ddl',
  'generate:db:seed',
  'generate:db:init',
  'generate:config:csv',
  'generate:config:faker',
  'generate:config:query',
  'generate:db:query',
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
  'cleanup:test:source'
];

/**
 * Generates VHS tape source files in docs/demos/tapes/ for each CLI command.
 * @param {Object} options 
 */
export async function generateDemoTape(options) {
  const tapesDir = path.join(process.cwd(), 'docs/demos/tapes');
  
  for (const cmd of CLI_COMMANDS) {
    const sanitizedCmd = cmd.replace(/:/g, '_');
    const outputPath = path.join(tapesDir, `${sanitizedCmd}.tape`);
    const gifPath = `docs/demos/gifs/${sanitizedCmd}.gif`;
    
    const tapeContent = `
Output ${gifPath}

Set FontSize 22
Set Width 1200
Set Height 600
Set Padding 50

Type "tusk ${cmd} --dry-run"
Sleep 500ms
Enter
Sleep 3s
`;

    if (options.dryRun) {
      console.log(`[DRY RUN] Would write VHS tape to ${path.relative(process.cwd(), outputPath)}`);
      continue;
    }

    if (safeWrite(outputPath, tapeContent.trim() + '\n', options.force)) {
      console.log(`Generated: ${path.relative(process.cwd(), outputPath)}`);
    }
  }
}

/**
 * Renders .tape files in docs/demos/tapes/ to GIFs using vhs.
 * @param {Object} options 
 */
export async function generateDemoRender(options) {
  // Pre-flight: Check if vhs is available
  try {
    await executeShell('vhs', ['--version']);
  } catch (error) {
    throw new Error('Pre-flight check failed: "vhs" is not available in the system path.');
  }

  const tapesDir = path.join(process.cwd(), 'docs/demos/tapes');
  if (!fs.existsSync(tapesDir)) {
    console.warn('Tapes directory not found. Run generate:demo:tape first.');
    return;
  }

  const files = fs.readdirSync(tapesDir).filter(f => f.endsWith('.tape'));
  if (files.length === 0) {
    console.log('No .tape files found in docs/demos/tapes/');
    return;
  }

  for (const file of files) {
    const inputPath = path.join(tapesDir, file);
    
    if (options.dryRun) {
      console.log(`[DRY RUN] Would execute: vhs ${path.relative(process.cwd(), inputPath)}`);
      continue;
    }

    console.log(`Rendering ${file} to GIF...`);
    try {
      await executeShell('vhs', [inputPath]);
      console.log(`Successfully rendered GIF for ${file}`);
    } catch (error) {
      console.error(`Failed to render ${file}: ${error.message}`);
    }
  }
}