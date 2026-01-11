import fs from 'node:fs';
import path from 'node:path';
import { safeWrite } from '../../utils/fileUtils.js';
import { generateConfigReset } from '../generate/configScaffold.js';
import { generateDbInit } from '../generate/dbInit.js';

/**
 * Initializes a new Tusk project by creating the directory structure and default config.
 * @param {Object} options 
 */
export async function initProject(options) {
  console.log('Initializing Tusk project...');

  const directories = [
    'bin',
    'src/commands',
    'src/faker-providers',
    'src/utils',
    'templates/faker',
    'templates/queries',
    'templates/csv',
    'infrastructure/build-context',
    'infrastructure/volume-mounts/ddl',
    'infrastructure/volume-mounts/scripts',
    'artifacts',
    'docs/diagrams',
    'docs/demos/tapes',
    'docs/demos/gifs',
    'test'
  ];

  // 1. Create Directories
  directories.forEach(dir => {
    const fullPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
    
    // Add .gitkeep to leaf/important directories
    const gitkeepPath = path.join(fullPath, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '', 'utf8');
    }
  });

  // 2. Create .gitignore if it doesn't exist
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  const gitignoreContent = `node_modules\n.DS_Store\ninfrastructure/volume-mounts/ddl/*.sql\n`;
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
    console.log('Created .gitignore');
  }

  // 3. Generate Default Config (tusk.yaml)
  // We reuse generateConfigReset but without the maintainer-only guard check here
  await generateConfigReset({ ...options, force: false });

  // 4. Generate Init SQL
  await generateDbInit({ ...options, force: false });

  console.log('\nProject initialization complete!');
  console.log('Next steps:');
  console.log('1. Edit tusk.yaml with your database details.');
  console.log('2. Run "tusk generate:db:ddl" to fetch your schema.');
}
