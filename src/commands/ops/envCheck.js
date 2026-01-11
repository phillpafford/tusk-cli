import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { executeShell } from '../../utils/psql.js';

/**
 * Performs a health check on the local development environment.
 * @param {Object} options - Command options.
 */
export async function envCheck(options) {
  const platform = os.platform();
  const results = [];

  // 1. Node.js Check
  results.push({
    component: 'Node.js',
    status: process.version,
    passed: true,
    remediation: 'N/A'
  });

  // 2. Port 5432 Conflict Check
  const isPortAvailable = await checkPortAvailable(5432);
  results.push({
    component: 'Port 5432',
    status: isPortAvailable ? 'Available' : 'Occupied (Likely Native Postgres)',
    passed: isPortAvailable,
    remediation: isPortAvailable ? 'N/A' : 'Stop local Postgres (brew services stop postgresql or quit Postgres.app)'
  });

  // 3. Docker Check
  try {
    await executeShell('docker', ['info']);
    results.push({
      component: 'Docker',
      status: 'Running',
      passed: true,
      remediation: 'N/A'
    });
  } catch (error) {
    results.push({
      component: 'Docker',
      status: 'Not Found / Not Running',
      passed: false,
      remediation: getInstallLink(platform, 'docker')
    });
  }

  // 3. PSQL Check
  try {
    const { stdout } = await executeShell('psql', ['--version']);
    results.push({
      component: 'psql',
      status: stdout,
      passed: true,
      remediation: 'N/A'
    });
  } catch (error) {
    results.push({
      component: 'psql',
      status: 'Not Found',
      passed: false,
      remediation: getInstallLink(platform, 'psql')
    });
  }

  // 4. .pgpass Check
  const pgPassPath = path.join(os.homedir(), '.pgpass');
  if (fs.existsSync(pgPassPath)) {
    results.push({
      component: '.pgpass',
      status: 'Exists',
      passed: true,
      remediation: 'N/A'
    });
  } else {
    results.push({
      component: '.pgpass',
      status: 'Missing',
      passed: false,
      remediation: 'Touch ~/.pgpass && chmod 0600 ~/.pgpass'
    });
  }

  printResultsTable(results);
}

/**
 * Returns OS-specific installation instructions.
 */
function getInstallLink(platform, tool) {
  const links = {
    darwin: {
      docker: 'https://docs.docker.com/desktop/install/mac-install/',
      psql: 'brew install postgresql@16'
    },
    linux: {
      docker: 'https://docs.docker.com/engine/install/',
      psql: 'sudo apt-get install postgresql-client-16'
    },
    win32: {
      docker: 'https://docs.docker.com/desktop/install/windows-install/',
      psql: 'https://www.postgresql.org/download/windows/'
    }
  };

  return links[platform]?.[tool] || `Install ${tool} for your OS.`;
}

/**
 * Prints a formatted ASCII table of results.
 */
function printResultsTable(results) {
  const headers = ['Component', 'Status', 'Pass', 'Remediation'];
  const colWidths = [15, 30, 6, 50];

  const rowSeparator = '+-' + colWidths.map(w => '-'.repeat(w)).join('-+-') + '-+';
  
  console.log(rowSeparator);
  console.log('| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |');
  console.log(rowSeparator);

  results.forEach(res => {
    const passMarker = res.passed ? 'YES' : 'NO';
    console.log('| ' + [
      res.component.padEnd(colWidths[0]),
      res.status.substring(0, colWidths[1]).padEnd(colWidths[1]),
      passMarker.padEnd(colWidths[2]),
      res.remediation.substring(0, colWidths[3]).padEnd(colWidths[3])
    ].join(' | ') + ' |');
  });

  console.log(rowSeparator);
}

/**
 * Checks if a port is available on the local machine.
 * @param {number} port 
 * @returns {Promise<boolean>}
 */
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true); // Other errors might mean it's not available, but we're mostly looking for In Use
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}
