import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { format } from "node:util";
import * as core from "@actions/core";
import { fileExtension, ignoreList, LOCALES_DIR, mainLanguage } from "./constants.js";

/**
 * Gets all files in a directory and subdirectories.
 * @param {string} dir
 * @returns {string[]} A list of all files in the directory and subdirectories.
 */
export function getFiles(dir) {
  /**
   * A list of all files in the directory and subdirectories.
   * @type {string[]}
   */
  const files = [];

  if (lstatSync(dir).isDirectory()) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const filePath = `${dir}/${entry}`;
      files.push(...getFiles(filePath));
      if (filePath.endsWith(fileExtension) && !ignoreList.includes(entry)) {
        files.push(filePath);
      }
    }
  }
  return files;
}

/**
 * Get a list of all language codes in the locales folder.
 * @returns {string[]} A list of all language codes.
 */
export function getLanguageCodes() {
  /**
   * A list of all language codes in the locales folder.
   * @type {string[]}
   */
  const languageCodes = [];

  if (existsSync(LOCALES_DIR)) {
    const folders = readdirSync(LOCALES_DIR);

    for (const folder of folders) {
      if (ignoreList.includes(folder)) {
        continue;
      }
      languageCodes.push(folder);
    }
  } else {
    const errStr = format("Locales folder not found: %s", LOCALES_DIR);
    core.setFailed(errStr);
    process.exit();
  }

  return languageCodes;
}

/**
 * Get the keys of a json file.
 * @param {string} filePath - The path to the file to read.
 * @returns {string[] | null} The keys for the file.
 */
export function getKeys(filePath) {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const fileContent = readFileSync(filePath, "utf8");
    const data = JSON.parse(fileContent);
    const keys = getKeysByData(data);
    const ret = keys.length > 0 ? keys : null;
    return ret;
  } catch (error) {
    core.setFailed(`Error parsing ${filePath}: ${error.message}`);
    return null;
  }
}

/** Get the keys from an json object.
 * This function is used by {@linkcode getKeys} to get nested keys.
 * @param {object} data - The json object to get the keys from.
 * @returns {string[]} The keys of the object, including nested keys.
 */
function getKeysByData(data) {
  if (typeof data !== "object") {
    return [];
  }
  const keys = [];
  for (const [key, value] of Object.entries(data)) {
    keys.push(key);
    if (typeof value === "object") {
      keys.push(...getKeysByData(value));
    }
  }
  return keys;
}

/**
 * @returns {fileKeys} The keys per file for the main language.
 */
export function getMainLanguageKeys() {
  const files = getFiles(mainLanguage);
  /** @type {fileKeys} */
  const mainLanguageKeys = {};

  for (const filePath of files) {
    const keys = getKeys(filePath);
    if (keys === null) {
      continue;
    }

    const fileName = removeLanguageCode(filePath);
    mainLanguageKeys[fileName] = keys;
  }
  return mainLanguageKeys;
}

/** Removes the language code from a file path.
 * @param {string} filePath - The file path to process.
 * @returns {string} The file path without the language code.
 */
export function removeLanguageCode(filePath) {
  const parts = filePath.split("/");
  const languageCodeIndex = parts.indexOf(LOCALES_DIR) + 1;
  return parts.slice(languageCodeIndex + 1).join("/");
}
