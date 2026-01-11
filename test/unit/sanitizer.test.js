import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeIdentifier } from '../../src/utils/sanitizer.js';

test('sanitizeIdentifier should replace spaces with single underscore', () => {
  assert.strictEqual(sanitizeIdentifier('HR Prod'), 'HR_Prod');
});

test('sanitizeIdentifier should replace special characters with single underscore', () => {
  assert.strictEqual(sanitizeIdentifier('user-data!#'), 'user_data_');
});

test('sanitizeIdentifier should collapse consecutive underscores', () => {
  assert.strictEqual(sanitizeIdentifier('my   database'), 'my_database');
  assert.strictEqual(sanitizeIdentifier('table__name'), 'table_name');
});

test('sanitizeIdentifier should handle empty strings', () => {
  assert.strictEqual(sanitizeIdentifier(''), '');
  assert.strictEqual(sanitizeIdentifier(null), '');
});

test('sanitizeIdentifier should preserve alphanumeric characters', () => {
  assert.strictEqual(sanitizeIdentifier('v16_production'), 'v16_production');
});
