import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Helper to parse ~/.pgpass and find a matching password.
 * Format: hostname:port:database:username:password
 */
function getPasswordFromPgPass(host, port, db, user) {
  const pgPassPath = path.join(os.homedir(), '.pgpass');
  if (!fs.existsSync(pgPassPath)) return null;

  try {
    const content = fs.readFileSync(pgPassPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      
      const [pHost, pPort, pDb, pUser, pPass] = line.split(':');
      
      const match = (val, pattern) => pattern === '*' || val === pattern;

      if (
        match(host, pHost) &&
        match(port, pPort) &&
        match(db, pDb) &&
        match(user, pUser)
      ) {
        return pPass.trim();
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read .pgpass: ${error.message}`);
  }
  return null;
}

/**
 * Extracts connection details from connection string or args.
 */
function resolveCredentials(args, env) {
  let host, port = '5432', db = 'postgres', user;

  // Improved parser for connection strings
  const dbnameIdx = args.indexOf('--dbname');
  if (dbnameIdx !== -1 && args[dbnameIdx + 1]) {
    const connStr = args[dbnameIdx + 1];
    try {
      // Handle postgresql://user[:password]@host[:port][/dbname][?options]
      const url = new URL(connStr.startsWith('postgresql://') ? connStr : `postgresql://${connStr}`);
      user = url.username || user;
      host = url.hostname || host;
      port = url.port || port;
      // url.pathname starts with /
      db = url.pathname.slice(1) || db;
    } catch (e) {
      // Fallback to regex if URL parsing fails
      const match = connStr.match(/postgresql:\/\/([^@]+)@([^/?:]+)(?::(\d+))?\/([^?]+)/);
      if (match) {
        user = match[1];
        host = match[2];
        if (match[3]) port = match[3];
        db = match[4];
      }
    }
  }

  if (host && user) {
    const pass = getPasswordFromPgPass(host, port, db, user);
    if (pass) {
      // Explicitly set PGPASSWORD to the one found in .pgpass
      return { ...env, PGPASSWORD: pass };
    }
  }

  return env;
}

/**
 * Executes a PSQL command.
 * @param {string} command - The full shell command.
 * @param {string[]} args - Arguments array.
 * @param {Object} options - { cwd, env }
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function executeShell(command, args, options = {}) {
  let env = { ...process.env, ...options.env };

  // Enforce Tusk Priority: 1. .pgpass, 2. ENV
  env = resolveCredentials(args, env);

  // Add -w flag to psql/pg_dump if not already present to prevent hangs
  const finalArgs = [...args];
  if ((command === 'psql' || command === 'pg_dump') && !finalArgs.includes('-w') && !finalArgs.includes('--no-password')) {
    finalArgs.unshift('-w');
  }

  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, finalArgs, {
      cwd: options.cwd,
      env: env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const trimmedStdout = stdout.trim();
      const trimmedStderr = stderr.trim();

      if (code === 0) {
        resolve({ stdout: trimmedStdout, stderr: trimmedStderr, code });
      } else {
        const error = new Error(`Command failed with code ${code}`);
        error.stdout = trimmedStdout;
        error.stderr = trimmedStderr;
        error.code = code;
        reject(error);
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}
