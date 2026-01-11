import { executeShell } from '../../utils/psql.js';

/**
 * Wrapper for npx prisma migrate diff.
 * @param {Object} options 
 */
export async function dbDiff(options) {
  // We assume standard prisma diff args or user-provided ones.
  // For now, we implement a basic wrapper as requested.
  const command = 'npx';
  const args = [
    'prisma', 'migrate', 'diff',
    '--from-schema-datamodel', 'schema.prisma',
    '--to-schema-datamodel', 'schema.prisma',
    '--script'
  ];

  if (options.dryRun) {
    console.log(`[DRY RUN] Would execute: ${command} ${args.join(' ')}`);
    return;
  }

  console.log('Running prisma migrate diff...');
  try {
    const { stdout, stderr } = await executeShell(command, args);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    throw new Error(`Prisma diff failed: ${error.message}`);
  }
}
