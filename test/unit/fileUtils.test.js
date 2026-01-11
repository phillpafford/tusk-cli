import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { safeWrite } from '../../src/utils/fileUtils.js';

test('fileUtils: safeWrite should write to a new file', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tusk-test-'));
  const testFile = path.join(tmpDir, 'new_file.txt');
  const content = 'hello world';

  try {
    const result = safeWrite(testFile, content);
    assert.strictEqual(result, true);
    assert.strictEqual(fs.readFileSync(testFile, 'utf8'), content);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fileUtils: safeWrite should respect @lock in first two lines', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tusk-test-'));
  const testFile = path.join(tmpDir, 'locked_file.txt');
  const initialContent = '-- @lock\nThis is locked.';
  fs.writeFileSync(testFile, initialContent);

  try {
    const newContent = 'trying to overwrite';
    const result = safeWrite(testFile, newContent);
    assert.strictEqual(result, false);
    assert.strictEqual(fs.readFileSync(testFile, 'utf8'), initialContent);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fileUtils: safeWrite should overwrite if @lock is not present', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tusk-test-'));
  const testFile = path.join(tmpDir, 'unlocked_file.txt');
  const initialContent = 'Not locked.';
  fs.writeFileSync(testFile, initialContent);

  try {
    const newContent = 'Successfully overwritten.';
    const result = safeWrite(testFile, newContent);
    assert.strictEqual(result, true);
    assert.strictEqual(fs.readFileSync(testFile, 'utf8'), newContent);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fileUtils: safeWrite should create parent directories if they do not exist', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tusk-test-'));
  const testFile = path.join(tmpDir, 'nested/dir/structure/file.txt');
  const content = 'nested content';

  try {
    const result = safeWrite(testFile, content);
    assert.strictEqual(result, true);
    assert.strictEqual(fs.readFileSync(testFile, 'utf8'), content);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
