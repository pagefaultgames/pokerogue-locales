import { endGroup } from "@actions/core";
import {
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toPascalSnakeCase,
  toSnakeCase,
  toUpperSnakeCase,
} from "../helpers/strings.mts";
import { COLORS, fileNameFormat, i18nextKeyExtensions, keyFormat, LOCALES_DIR, mainLanguage } from "./constants.mts";
import { getFiles, getKeys, getMainLanguageKeys, removeLanguageCode } from "./get-files.mts";
import type {
  FileKeys,
  Format,
  IncorrectFileName,
  IncorrectFileNames,
  IncorrectKey,
  IncorrectKeys,
  Options,
} from "./types.mts";
import { failed, logInfo, logStartGroup } from "./utils.mts";

// #region Key Format

/**
 * Check the key format of all locales files.
 * @param options - The command line options
 * @returns The incorrect keys found.
 */
export function checkLocaleKeys(options: Options): IncorrectKeys {
  let incorrectKeys: IncorrectKeys = {};

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
 * @param filePath - The path to the file to check
 * @param options - The command line options
 * @returns The incorrect keys found in the file.
 */
function checkForIncorrectKeys(filePath: string, options: Options): IncorrectKeys | null {
  const incorrectKeys: IncorrectKeys = {};
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
 * @param key - The key to analyze
 * @param index - The index of the key
 * @param options - The command line options
 * @returns The incorrect key and its correction or null if the key is correct.
 */
function analyzeKey(key: string, index: number, options: Options): IncorrectKey | null {
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
 * @param key - The key to process
 * @returns The correct processed key.
 */
function processExtensions(key: string): string {
  let ret: string;
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
 * @param options - The command line options
 * @returns The incorrect file names found.
 */
export function checkLocaleFileNames(options: Options): IncorrectFileNames {
  const incorrectFileNames: IncorrectFileNames = {};

  for (const languageCode of options.languages) {
    const logFunc = options.verbose ? logStartGroup : logInfo;
    logFunc(COLORS.info, `Checking file names for "${languageCode}"`);

    const path = `${LOCALES_DIR}/${languageCode}`;
    const files = getFiles(path);
    let languageCodeIncorrectFiles = 0;
    const invalidFileNamesForLang: IncorrectFileName[] = [];

    for (const filePath of files) {
      const fileNameResult = checkForIncorrectFileName(filePath, options);
      if (fileNameResult !== null) {
        invalidFileNamesForLang.push(fileNameResult);
        languageCodeIncorrectFiles++;
      }
    }
    if (languageCodeIncorrectFiles > 0) {
      incorrectFileNames[languageCode] = invalidFileNamesForLang;
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
 * @param filePath - The path to the file to check
 * @param options - The command line options
 * @returns The incorrect file name found.
 */
function checkForIncorrectFileName(filePath: string, options: Options): IncorrectFileName | null {
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
 * @param options - The command line options
 * @returns The incorrect file names found.
 */
export function checkLocaleMissingKeys(options: Options): FileKeys {
  const missingKeys: FileKeys = {};

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
 * @param filePath - The path to the file to check
 * @param options - The command line options
 * @returns the keys, that don't exist in the main language
 */
function checkForMissingKeys(filePath: string, options: Options): string[] | null {
  const missingKeys: string[] = [];
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
 * @param key - The key to get the correct format for
 * @param format - The format to get the correct format for
 * @returns The correct format.
 */
function getCorrectFormat(key: string, format: Format): string {
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
 * @param color - The color to apply to the message
 * @param text - The text to print to the console
 * @param options - The command line options
 */
function printVerboseLog(color: string, text: string, options: Options): void {
  if (options.verbose) {
    logInfo(color, text);
  }
}
