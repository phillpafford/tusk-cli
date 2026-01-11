import fs from 'node:fs';
import path from 'node:path';

/**
 * Safely writes content to a file, respecting the @lock rule.
 * The rule (PRD 5.1) states that if the first two lines contain '@lock',
 * the file must not be overwritten.
 * 
 * @param {string} filePath - Path to the file.
 * @param {string} content - Content to write.
 * @param {boolean} force - If true, bypasses the @lock check.
 */
export function safeWrite(filePath, content, force = false) {
  if (fs.existsSync(filePath) && !force) {
    const existing = fs.readFileSync(filePath, 'utf8');
    const lines = existing.split('\n', 2);
    const lockFound = lines.some(line => line.includes('@lock'));
    
    if (lockFound) {
      console.warn(`Warning: ${filePath} is @lock protected. Skipping write.`);
      return false;
    }
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}
