import * as core from "@actions/core";
import {
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toPascalSnakeCase,
  toSnakeCase,
  toUpperSnakeCase,
} from "../helpers/strings.js";


/**
 * Prints a console log if verbose logging is enabled
 * @param {string} text - The text to print to the console
 * @param {options} options - The command line options.
 */
export function printVerboseLog(text, options) {
  if (options.verbose) {
    core.info(text);
  }
}

/**
 * Returns the correct format for the provided format.
 * @param {string} key - The key to get the correct format for.
 * @param {format} format - The format to get the correct format for.
 * @returns {string} The correct format.
 */
export function getCorrectFormat(key, format) {
  switch (format) {
    case "camelCase":
      return toCamelCase(key);
    case "kebab-case":
      return toKebabCase(key);
    case "PascalCase":
      return toPascalCase(key);
    case "snake_case":
      return toSnakeCase(key);
    case "UPPER_SNAKE_CASE":
      return toUpperSnakeCase(key);
    case "Pascal_Snake_Case":
      return toPascalSnakeCase(key);
    default:
      core.setFailed(`Unknown format: "${format}"`);
  }
}
