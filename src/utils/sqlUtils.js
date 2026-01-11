/**
 * Formats a value for SQL insertion.
 * Adheres to the strict formatting logic defined in PRD 4.3.1.
 * 
 * @param {any} val 
 * @returns {string}
 */
export function formatValue(val) {
  if (val === null || val === undefined) {
    return `NULL`;
  }
  if (typeof val === 'number') {
    return `${val}`;
  }
  if (typeof val === 'boolean') {
    return val ? `TRUE` : `FALSE`;
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === 'string') {
    // Escape single quotes by doubling them
    return `'${val.replace(/'/g, "''")}'`;
  }
  if (typeof val === 'object') {
    // For arrays or objects, store as JSON string
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}
