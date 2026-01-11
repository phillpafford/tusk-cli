/**
 * Sanitizes a string segment for use in filenames.
 * Replaces spaces or special characters with a SINGLE underscore.
 * 
 * @param {string} str - The raw string segment to sanitize.
 * @returns {string} The sanitized string.
 */
export function sanitizeIdentifier(str) {
  if (!str) return '';
  // Replace spaces and special characters with a single underscore
  // and collapse consecutive underscores into one.
  return str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
}
