/**
 * TUSK-CLI ASCII Wordmark
 * Standard "Big" font variant.
 */
export const TUSK_BRAND_ASCII = String.raw`  _____ _   _ ____  _  __      ____ _     ___ 
 |_   _| | | / ___|| |/ /     / ___| |   |_ _|
   | | | | | \___ \| ' /_____| |   | |    | |
   | | | |_| |___) | . \_____| |___| |___ | |
   |_|  \___/|____/|_|\_\     \____|_____|___|`;

/**
 * Returns the formatted branding string.
 * Aligned for the 46-char wide ASCII art.
 */
export function getBrandingText(version = '0.0.0') {
  return [
    TUSK_BRAND_ASCII,
    '    LOCAL POSTGRESQL DEVELOPMENT ENVIRONMENT',
    `                VERSION: ${version}`,
    ''.padEnd(46, '-') ,
    ''
  ].join('\n');
}