/**
 * @typedef {{ incorrectKey: string, correctedKey: string, line: number }} incorrectKey
 */

/**
 * @typedef {Object.<string, incorrectKey[]>} incorrectKeys
 */

/**
 * @typedef {{ checkKeys: boolean, checkFileNames: boolean, checkMissing: boolean, verbose: boolean, languages: string[] }} options
 */

/**
 * @typedef {{ incorrectFileName: string, correctedFileName: string }} incorrectFileName
 */

/**
 * @typedef {Object.<string, incorrectFileName[]} incorrectFileNames
 */

/**
 * @typedef {Object.<string, string[]>} fileKeys
 */

/**
 * @typedef {"camelCase" | "kebab-case" | "PascalCase" | "snake_case" | "UPPER_SNAKE_CASE" | "Pascal_Snake_Case"} format
 */
