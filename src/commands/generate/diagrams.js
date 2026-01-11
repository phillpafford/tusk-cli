import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { executeShell } from '../../utils/psql.js';
import { safeWrite } from '../../utils/fileUtils.js';

/**
 * Generates Mermaid source files in docs/diagrams/ based on tusk.yaml.
 * @param {Object} options 
 */
export async function generateDiagramMMD(options) {
  const configPath = path.resolve(process.cwd(), 'tusk.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('tusk.yaml not found.');
  }

  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const databases = config.databases || [];

  // 1. Architecture Diagram
  let archMMD = `graph LR\n`;
  archMMD += `  subgraph RemoteSources["Remote PostgreSQL Sources"]\n`;
  databases.forEach(db => {
    archMMD += `    ${db.source_name}["${db.source_name}<br/>(${db.host})"]\n`;
  });
  archMMD += `  end\n\n`;

  archMMD += `  subgraph LocalEnvironment["Local Docker Environment"]\n`;
  databases.forEach(db => {
    archMMD += `    ${db.local_target_name}["Target DB: ${db.local_target_name}"]\n`;
  });
  archMMD += `  end\n\n`;

  databases.forEach(db => {
    archMMD += `  ${db.source_name} -- "Tusk Sync" --> ${db.local_target_name}\n`;
  });

  // 2. Workflow Diagram
  let workflowMMD = `graph TD\n`;
  workflowMMD += `  subgraph Discovery["1. Discovery & Extraction"]\n`;
  workflowMMD += `    A[tusk.yaml] --> B["generate:db:ddl"]\n`;
  workflowMMD += `    B --> C["pg_dump (Remote)"]\n`;
  workflowMMD += `    C --> D[Sanitizer]\n`;
  workflowMMD += `    D --> E["infrastructure/volume-mounts/ddl/200__*.sql"]\n`;
  workflowMMD += `  end\n\n`;

  workflowMMD += `  subgraph Seeding["2. Data Generation"]\n`;
  workflowMMD += `    F["generate:db:seed"] --> G{Strategies}\n`;
  workflowMMD += `    G --> G1[Dump - 400]\n`;
  workflowMMD += `    G --> G2[Query - 600]\n`;
  workflowMMD += `    G --> G3[CSV - 600]\n`;
  workflowMMD += `    G --> G4[Faker - 800]\n`;
  workflowMMD += `    G1 & G2 & G3 & G4 --> H["infrastructure/volume-mounts/ddl/*.sql"]\n`;
  workflowMMD += `  end\n\n`;

  workflowMMD += `  subgraph Boot["3. Local Environment Boot"]\n`;
  workflowMMD += `    I["docker-compose up"] --> J["Mount /docker-entrypoint-initdb.d"]\n`;
  workflowMMD += `    J --> K["scripts/001_run_all.sh"]\n`;
  workflowMMD += `    K --> L["psql (Local Container DB)"]\n`;
  workflowMMD += `    E & H --> K\n`;
  workflowMMD += `  end\n\n`;

  workflowMMD += `  subgraph Ops["4. Operational Lifecycle"]\n`;
  workflowMMD += `    M["bundle:deploy:plan"] --> N["prisma migrate diff"]\n`;
  workflowMMD += `    N --> O["artifacts/deploy_*.sql"]\n`;
  workflowMMD += `    P["ops:db:sync"] --> L\n`;
  workflowMMD += `end\n`;

  const archPath = path.join(process.cwd(), 'docs/diagrams/architecture.mmd');
  const workflowPath = path.join(process.cwd(), 'docs/diagrams/workflow.mmd');

  if (options.dryRun) {
    console.log(`[DRY RUN] Would write Mermaid files to docs/diagrams/`);
    return;
  }

  if (safeWrite(archPath, archMMD, options.force)) {
    console.log(`Generated: ${path.relative(process.cwd(), archPath)}`);
  }
  if (safeWrite(workflowPath, workflowMMD, options.force)) {
    console.log(`Generated: ${path.relative(process.cwd(), workflowPath)}`);
  }
}

/**
 * Renders .mmd files in docs/diagrams/ to PNG using mermaid-cli.
 * @param {Object} options 
 */
export async function generateDiagramRender(options) {
  try {
    await executeShell('npx', ['--version']);
  } catch (error) {
    throw new Error('Pre-flight check failed: "npx" is not available.');
  }

  const diagramsDir = path.join(process.cwd(), 'docs/diagrams');
  if (!fs.existsSync(diagramsDir)) {
    console.warn('Diagrams directory not found.');
    return;
  }

  const files = fs.readdirSync(diagramsDir).filter(f => f.endsWith('.mmd'));
  
  for (const file of files) {
    const inputPath = path.join(diagramsDir, file);
    const outputPath = inputPath.replace('.mmd', '.png');

    if (fs.existsSync(outputPath) && !options.force) {
      console.log(`Skipping ${file} - output already exists. Use --force to overwrite.`);
      continue;
    }

    const args = ['-p', '@mermaid-js/mermaid-cli', 'mmdc', '-i', inputPath, '-o', outputPath];

    if (options.dryRun) {
      console.log(`[DRY RUN] Would render ${file}`);
      continue;
    }

    console.log(`Rendering ${file}...`);
    try {
      await executeShell('npx', args);
      console.log(`Rendered: ${path.relative(process.cwd(), outputPath)}`);
    } catch (error) {
      console.error(`Failed to render ${file}: ${error.message}`);
    }
  }
}