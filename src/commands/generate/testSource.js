import fs from 'node:fs';
import path from 'node:path';
import { safeWrite } from '../../utils/fileUtils.js';

/**
 * Generates a mock remote source database suite.
 * @param {Object} options 
 */
export async function generateTestSource(options) {
  const context = options.context || 'General System';
  const targetDir = path.join(process.cwd(), 'test/fixtures/source_db');

  const files = [
    {
      name: '01_schema.sql',
      content: `
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
`
    },
    {
      name: '02_data.sql',
      content: `
-- Using COPY syntax for parity check
COPY users (id, username, email) FROM stdin;
1\tjdoe\tjohn@example.com
2\tasmith\talice@example.com
\\

SELECT setval('users_id_seq', 2, true);

COPY posts (id, user_id, content) FROM stdin;
1\t1\tHello from John
2\t1\tAnother post
3\t2\tAlice says hi
\\

SELECT setval('posts_id_seq', 3, true);
`
    },
    {
      name: 'docker-compose.source.yml',
      content: `
version: '3.8'
services:
  mock_remote_db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=postgres
    volumes:
      - .:/docker-entrypoint-initdb.d
    ports:
      - "5433:5432"
`
    }
  ];

  if (options.dryRun) {
    const relTargetDir = path.relative(process.cwd(), targetDir);
    console.log(`[DRY RUN] Would generate mock source in ${relTargetDir} with context: ${context}`);
    return;
  }

  files.forEach(file => {
    const filePath = path.join(targetDir, file.name);
    if (safeWrite(filePath, file.content.trim() + '\n')) {
      console.log(`Generated: ${path.relative(process.cwd(), filePath)}`);
    }
  });

    console.log('Mock Remote Source generated successfully.');

  }

  
