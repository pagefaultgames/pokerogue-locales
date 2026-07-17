import { endGroup } from "@actions/core";
import {
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toPascalSnakeCase,
  toSnakeCase,
  toUpperSnakeCase,
} from "../helpers/strings.js";
import { COLORS, fileNameFormat, i18nextKeyExtensions, keyFormat, LOCALES_DIR, mainLanguage } from "./constants.js";
import { getFiles, getKeys, getMainLanguageKeys, removeLanguageCode } from "./get-files.js";
import { failed, logInfo, logStartGroup } from "./utils.js";

/** @import { FileKeys, Format, IncorrectFileName, IncorrectFileNames, IncorrectKey, IncorrectKeys, Options } from "./types.js" */

// #region Key Format

/**
 * Check the key format of all locales files.
 * @param {Options} options - The command line options
 * @returns {IncorrectKeys} The incorrect keys found.
 */
export function checkLocaleKeys(options) {
  /** @type {IncorrectKeys} */
  let incorrectKeys = {};

  for (const languageCode of options.languages) {
    const logFunc = options.verbose ? logStartGroup : logInfo;
    logFunc(COLORS.info, `Checking keys for "${languageCode}"`);

    const path = `${LOCALES_DIR}/${languageCode}`;
    const files = getFiles(path);
    let languageCodeIncorrectKeys = 0;

    for (const filePath of files) {
      const fileIncorrectKeys = checkForIncorrectKeys(filePath, options);
      if (fileIncorrectKeys !== null) {
        incorrectKeys = { ...incorrectKeys, ...fileIncorrectKeys };
        languageCodeIncorrectKeys += Object.values(fileIncorrectKeys).reduce((sum, val) => sum + val.length, 0);
      }
    }

    if (options.verbose) {
      endGroup();
    }
    logInfo(
      COLORS.magenta,
      `Checked ${files.length} files for language "${languageCode}" and found ${languageCodeIncorrectKeys} incorrect keys.\n`,
    );
  }

  return incorrectKeys;
}

/**
 * Check a file for incorrect keys.
 * @param {string} filePath - The path to the file to check
 * @param {Options} options - The command line options
 * @returns {IncorrectKeys | null} The incorrect keys found in the file.
 */
function checkForIncorrectKeys(filePath, options) {
  /** @type {IncorrectKeys} */
  const incorrectKeys = {};
  printVerboseLog(COLORS.file, `checking file: ${filePath}`, options);

  const keys = getKeys(filePath);
  if (keys === null) {
    printVerboseLog(COLORS.info, `No keys found in ${filePath}`, options);
    return null;
  }
  const entries = keys.map((key, index) => analyzeKey(key, index, options)).filter((e) => e !== null);

  if (entries.length > 0) {
    incorrectKeys[filePath] = entries;
  }

  if (entries.length === 0) {
    printVerboseLog(COLORS.green, `No incorrect keys found in ${filePath}`, options);
  } else {
    printVerboseLog(COLORS.red, `Found ${entries.length} incorrect keys in ${filePath}`, options);
  }
  return incorrectKeys;
}

/**
 * Analyze a key for correctness.
 * @param {string} key - The key to analyze
 * @param {number} index - The index of the key
 * @param {Options} options - The command line options
 * @returns {IncorrectKey | null} The incorrect key and its correction or null if the key is correct.
 */
function analyzeKey(key, index, options) {
  const line = index + 2;
  let correctKey = getCorrectFormat(key, keyFormat);
  if (key.includes("_")) {
    correctKey = processExtensions(key);
  }
  if (correctKey === key) {
    return null;
  }

  printVerboseLog(COLORS.red, `Incorrect key found at line ${line}: ${key}`, options);
  printVerboseLog(COLORS.corrected, `Correct key: ${correctKey}`, options);
  return { incorrectKey: key, correctedKey: correctKey, line };
}

/**
 * Process i18next key extensions.
 * @param {string} key - The key to process
 * @returns {string} The correct processed key.
 */
function processExtensions(key) {
  let ret;
  const parts = key.split("_");
  ret = parts[0];
  for (const part of parts.slice(1)) {
    if (i18nextKeyExtensions.includes(`_${part}`)) {
      ret += `_${part}`;
    } else {
      ret += toPascalCase(part);
    }
  }
  return ret;
}

// #endregion Key Format

// #region File Name Format

/**
 * Check the file name format of all locales files.
 * @param {Options} options - The command line options
 * @returns {IncorrectFileNames} The incorrect file names found.
 */
export function checkLocaleFileNames(options) {
  /** @type {IncorrectFileNames} */
  const incorrectFileNames = {};

  for (const languageCode of options.languages) {
    const logFunc = options.verbose ? logStartGroup : logInfo;
    logFunc(COLORS.info, `Checking file names for "${languageCode}"`);

    const path = `${LOCALES_DIR}/${languageCode}`;
    const files = getFiles(path);
    let languageCodeIncorrectFiles = 0;
    const InvalidFileNamesForLang = [];

    for (const filePath of files) {
      const fileNameResult = checkForIncorrectFileName(filePath, options);
      if (fileNameResult !== null) {
        InvalidFileNamesForLang.push(fileNameResult);
        languageCodeIncorrectFiles++;
      }
    }
    if (languageCodeIncorrectFiles > 0) {
      incorrectFileNames[languageCode] = InvalidFileNamesForLang;
    }

    if (options.verbose) {
      endGroup();
    }
    logInfo(
      COLORS.magenta,
      `Checked ${files.length} files for language "${languageCode}" and found ${languageCodeIncorrectFiles} incorrect file names.\n`,
    );
  }

  return incorrectFileNames;
}

/**
 * Check a file name for incorrect format.
 * @param {string} filePath - The path to the file to check
 * @param {Options} options - The command line options
 * @returns {IncorrectFileName | null} The incorrect file name found.
 */
function checkForIncorrectFileName(filePath, options) {
  printVerboseLog(COLORS.file, `checking file: ${filePath}`, options);

  const fileName = filePath.split("/").pop();
  if (fileName === undefined) {
    printVerboseLog(COLORS.red, `No file found at path: ${filePath}`, options);
    return null;
  }

  const correctFileName = getCorrectFormat(fileName, fileNameFormat);
  if (correctFileName === fileName) {
    return null;
  }

  printVerboseLog(COLORS.red, `Incorrect file name found: ${fileName}`, options);
  printVerboseLog(COLORS.corrected, `Correct file name: ${correctFileName}`, options);
  return { incorrectFileName: fileName, correctedFileName: correctFileName };
}

// #endregion File Name Format

// #region Missing Keys

/**
 * Check the file name format of all locales files.
 * @param {Options} options - The command line options
 * @returns {FileKeys} The incorrect file names found.
 */
export function checkLocaleMissingKeys(options) {
  /** @type {FileKeys} */
  const missingKeys = {};

  for (const languageCode of options.languages) {
    if (languageCode === mainLanguage) {
      continue;
    }

    const logFunc = options.verbose ? logStartGroup : logInfo;
    logFunc(COLORS.info, `Checking missing keys for "${languageCode}"`);

    const path = `${LOCALES_DIR}/${languageCode}`;
    const files = getFiles(path);
    let languageCodeMissingKeys = 0;

    for (const filePath of files) {
      const fileMissingKeys = checkForMissingKeys(filePath, options);
      if (fileMissingKeys !== null && fileMissingKeys.length > 0) {
        missingKeys[filePath] = fileMissingKeys;
        languageCodeMissingKeys += fileMissingKeys.length;
      }
    }

    if (options.verbose) {
      endGroup();
    }
    logInfo(
      COLORS.magenta,
      `Checked ${files.length} files for language "${languageCode}" and found ${languageCodeMissingKeys} incorrect keys.`,
    );
  }

  return missingKeys;
}

/** Check for keys, that don't exist in the main language
 * @param {string} filePath - The path to the file to check
 * @param {Options} options - The command line options
 * @returns {string[] | null} the keys, that don't exist in the main language
 */
function checkForMissingKeys(filePath, options) {
  /** @type {string[]} */
  const missingKeys = [];
  printVerboseLog(COLORS.file, `checking file: ${filePath}`, options);

  const keys = getKeys(filePath);
  if (keys === null) {
    return null;
  }
  const mainLanguageKeys = getMainLanguageKeys();
  const fileName = removeLanguageCode(filePath);
  for (const key of keys) {
    const keyExists = mainLanguageKeys[fileName].includes(key);
    if (!keyExists) {
      missingKeys.push(key);

      printVerboseLog(COLORS.red, `Missing key found: ${key}`, options);
    }
  }

  if (missingKeys.length > 0 && options.verbose) {
    logInfo(COLORS.red, `Found ${missingKeys.length} missing keys in ${filePath}`);
  }
  return missingKeys;
}

// #endregion Missing Keys

/**
 * Returns the correct format for the provided format.
 * @param {string} key - The key to get the correct format for
 * @param {Format} format - The format to get the correct format for
 * @returns {string} The correct format.
 */
function getCorrectFormat(key, format) {
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
      failed(`Unknown format: "${format}"`);
      return "";
  }
}

/**
 * Prints a console log if verbose logging is enabled
 * @param {string} color - The color to apply to the message
 * @param {string} text - The text to print to the console
 * @param {Options} options - The command line options
 */
function printVerboseLog(color, text, options) {
  if (options.verbose) {
    logInfo(color, text);
  }
}
