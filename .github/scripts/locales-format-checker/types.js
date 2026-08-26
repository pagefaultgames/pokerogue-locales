/**
 * @typedef {{ incorrectKey: string, correctedKey: string, line: number }} IncorrectKey
 */

/**
 * @typedef {Object.<string, IncorrectKey[]>} IncorrectKeys
 */

/**
 * @typedef {{ checkKeys: boolean, checkFileNames: boolean, checkMissing: boolean, verbose: boolean, languages: string[] }} Options
 */

/**
 * @typedef {{ incorrectFileName: string, correctedFileName: string }} IncorrectFileName
 */

/**
 * @typedef {Object.<string, IncorrectFileName[]>} IncorrectFileNames
 */

/**
 * @typedef {Object.<string, string[]>} FileKeys
 */

/**
 * @typedef {"camelCase" | "kebab-case" | "PascalCase" | "snake_case" | "UPPER_SNAKE_CASE" | "Pascal_Snake_Case"} Format
 */
