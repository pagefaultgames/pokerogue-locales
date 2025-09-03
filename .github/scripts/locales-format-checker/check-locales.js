import * as core from "@actions/core";
import { existsSync, readFileSync } from "node:fs";
import {
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toPascalSnakeCase,
  toSnakeCase,
  toUpperSnakeCase,
} from "../helpers/strings.js";
import { COLORS, fileNameFormat, i18nextKeyExtensions, keyFormat, LOCALES_DIR } from "./constants.js";
import { getFiles } from "./get-files.js";

//#region Key Format

/**
 * Check the key format of all locales files.
 * @param {options} options - The options to use.
 * @returns {Promise<incorrectKeys>} The incorrect keys found.
 */
export async function checkLocaleKeys(options) {
  return new Promise(resolve => {
    /** @type {incorrectKeys} */
    let incorrectKeys = {};

    for (const languageCode of options.languages) {
      core.startGroup(`Checking keys for ${languageCode}`);
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
      core.info(
        `${COLORS.magenta}Checked ${files.length} files for ${languageCode} and found ${languageCodeIncorrectKeys} incorrect keys.`,
      );
      core.endGroup();
    }
    resolve(incorrectKeys);
  });
}

/**
 * Read a file and return its content.
 * @param {string} filePath - The path to the file to read.
 * @returns {string | null} The content of the file.
 */
function readFileContent(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, "utf8");
}

/**
 * Check a file for incorrect keys.
 * @param {string} filePath - The path to the file to check.
 * @param {options} options - The options to use.
 * @returns {incorrectKeys | null} The incorrect keys found in the file.
 */
function checkForIncorrectKeys(filePath, options) {
  /** @type {incorrectKeys} */
  const incorrectKeys = {};
  if (options.verbose) {
    core.info(`${COLORS.file}checking file: ${filePath}`);
  }

  let data;
  try {
    const fileContent = readFileContent(filePath);
    if (fileContent === null) {
      return null;
    }
    data = JSON.parse(fileContent);
  } catch (e) {
    core.setFailed(`Error parsing ${filePath}: ${e.message}`);
  }
  const keys = Object.keys(data);

  const entries = keys.map((key, index) => analyzeKey(key, index, options)).filter(e => e !== null);

  if (entries.length > 0) {
    incorrectKeys[filePath] = entries;
  }

  if (entries.length === 0 && options.verbose) {
    core.info(`${COLORS.green}No incorrect keys found in ${filePath}`);
  } else {
    if (options.verbose) {
      core.info(`${COLORS.red}Found ${entries.length} incorrect keys in ${filePath}`);
    }
  }
  return incorrectKeys;
}

/**
 * Analyze a key for correctness.
 * @param {string} key - The key to analyze.
 * @param {number} index - The index of the key.
 * @param {options} options - The options to use.
 * @returns {incorrectKey | null} The incorrect key and its correction or null if the key is correct.
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
  if (options.verbose) {
    core.info(`${COLORS.red}Incorrect key found at line ${line}: ${key}`);
  core.info(`${COLORS.corrected}Correct key: ${correctKey}`);
  }
  return { incorrectKey: key, correctedKey: correctKey, line: line };
}

/**
 * Process i18next key extensions.
 * @param {string} key - The key to process.
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

//#endregion

//#region File Name Format

/**
 * Check the file name format of all locales files.
 * @param {options} options - The options to use.
 * @returns {Promise<incorrectFileNames>} The incorrect file names found.
 */
export async function checkLocaleFileNames(options) {
  return new Promise(resolve => {
    /** @type {incorrectFileNames} */
    const incorrectFileNames = {};

    for (const languageCode of options.languages) {
      core.startGroup(`Checking file names for ${languageCode}`);
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
      core.info(
          `${COLORS.magenta}Checked ${files.length} files for ${languageCode} and found ${languageCodeIncorrectFiles} incorrect file names.`,
      );
      if (languageCodeIncorrectFiles > 0) {
        incorrectFileNames[languageCode] = InvalidFileNamesForLang;
      }
      core.endGroup();
    }
    resolve(incorrectFileNames);
  });
}

/**
 * Check a file name for incorrect format.
 * @param {string} filePath - The path to the file to check.
 * @param {options} options - The options to use.
 * @returns {incorrectFileName | null} The incorrect file name found.
 */
function checkForIncorrectFileName(filePath, options) {
  if (options.verbose) {
    core.info(`${COLORS.file}checking file: ${filePath}`);
  }

  const fileName = filePath.split("/").pop();
  if (fileName === undefined) {
    return null;
  }

  const correctFileName = getCorrectFormat(fileName, fileNameFormat);
  if (correctFileName === fileName) {
    return null;
  }
  if (options.verbose) {
    core.info(`${COLORS.red}Incorrect file name found: ${fileName}`);
    core.info(`${COLORS.corrected}Correct file name: ${correctFileName}`);
  }
  return { incorrectFileName: fileName, correctedFileName: correctFileName };
}

//#endregion

/**
 * Returns the correct format for the provided format.
 * @param {string} key - The key to get the correct format for.
 * @param {format} format - The format to get the correct format for.
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
      core.setFailed(`Unknown format: ${format}`);
  }
}
