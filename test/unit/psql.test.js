import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { executeShell } from '../../src/utils/psql.js';

test('psql: executeShell should resolve on successful command', async (t) => {
  const mockChild = new EventEmitter();
  mockChild.stdout = new EventEmitter();
  mockChild.stderr = new EventEmitter();
  
  t.mock.method(childProcess, 'spawn', () => {
    setImmediate(() => {
      mockChild.stdout.emit('data', 'success output');
      mockChild.emit('close', 0);
    });
    return mockChild;
  });

  const result = await executeShell('echo', ['success']);
  assert.strictEqual(result.stdout, 'success output');
  assert.strictEqual(result.code, 0);
});

test('psql: executeShell should reject on non-zero exit code', async (t) => {
  const mockChild = new EventEmitter();
  mockChild.stdout = new EventEmitter();
  mockChild.stderr = new EventEmitter();
  
  t.mock.method(childProcess, 'spawn', () => {
    setImmediate(() => {
      mockChild.stderr.emit('data', 'error message');
      mockChild.emit('close', 1);
    });
    return mockChild;
  });

  await assert.rejects(
    executeShell('invalid_command', []),
    {
      message: 'Command failed with code 1',
      stderr: 'error message',
      code: 1
    }
  );
});

test('psql: executeShell should reject on spawn error', async (t) => {
  const mockChild = new EventEmitter();
  mockChild.stdout = new EventEmitter();
  mockChild.stderr = new EventEmitter();
  
  t.mock.method(childProcess, 'spawn', () => {
    setImmediate(() => {
      mockChild.emit('error', new Error('Spawn failed'));
    });
    return mockChild;
  });

  await assert.rejects(
    executeShell('echo', []),
    { message: 'Spawn failed' }
  );
});
