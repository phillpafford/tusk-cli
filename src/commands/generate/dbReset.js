import { generateConfigReset, generateFakerScaffold } from './configScaffold.js';
import { cleanupDbArtifacts } from '../cleanup/dbArtifacts.js';
import { generateDbInit } from './dbInit.js';
import { generateDiagramMMD } from './diagrams.js';
import { generateDemoTape } from './demos.js';
import { safeWrite } from '../../utils/fileUtils.js';
import path from 'node:path';

/**
 * Perform a full project reset for contributors.
 * 1. Resets tusk.yaml to the demo configuration.
 * 2. Deletes all generated SQL artifacts and existing templates.
 * 3. Regenerates the basic 000_init.sql based on the new config.
 * 4. Scaffolds default demo templates (Faker, Query, CSV).
 * 
 * @param {Object} options 
 */
export async function generateDbReset(options) {
  console.log('\n--- Starting Full Project Reset ---');

  // We force the internal commands to bypass prompts/locks if --force is passed
  const internalOptions = { ...options, force: true };

  // 1. Reset Config
  console.log('\n[1/4] Resetting tusk.yaml...');
  await generateConfigReset(internalOptions);

  // 2. Cleanup Artifacts & Old Templates
  console.log('\n[2/4] Cleaning up database artifacts and old templates...');
  await cleanupDbArtifacts(internalOptions);

  // 3. Generate Init SQL
  console.log('\n[3/4] Regenerating 000_init.sql...');
  await generateDbInit(internalOptions);

  // 4. Scaffold Demo Templates
  console.log('\n[4/4] Scaffolding default demo templates...');
  
  // Scaffold Faker for Authors
  const authorsFakerPath = path.resolve(process.cwd(), 'templates/faker/authors.yaml');
  generateFakerScaffold(authorsFakerPath, 'bookstore_ops.authors', internalOptions);

  // Scaffold example CSV
  const booksCSVPath = path.resolve(process.cwd(), 'templates/csv/books.csv');
  const booksCSVContent = `id,title,author_id,published_year\n1,The Pragmatic Architect,1,2024\n2,Legacy Code Survival,2,2023\n`;
  safeWrite(booksCSVPath, booksCSVContent, true);

  // Scaffold example Query
  const authorsQueryPath = path.resolve(process.cwd(), 'templates/queries/authors_lookup.sql');
  const authorsQueryContent = `-- @database tusk_demo
-- @schema bookstore_ops
-- @table authors

SELECT id, name FROM bookstore_ops.authors ORDER BY name ASC;
`;
  safeWrite(authorsQueryPath, authorsQueryContent, true);

  // 5. Documentation Assets
  console.log('\n[5/5] Re-scaffolding documentation assets...');
  await generateDiagramMMD(internalOptions);
  await generateDemoTape(internalOptions);

  console.log('\nProject reset to demo defaults. Next: "tusk generate:db:ddl"');
}
