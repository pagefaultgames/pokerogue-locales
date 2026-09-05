import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { format } from "node:util";
import { fileExtension, ignoreList, LOCALES_DIR, mainLanguage } from "./constants.mts";
import type { FileKeys } from "./types.mts";
import { failed } from "./utils.mts";

/**
 * Gets all files in a directory and subdirectories.
 * @param dir - The directory to process
 * @returns A list of all files in the directory and subdirectories.
 */
export function getFiles(dir: string): string[] {
  /** A list of all files in the directory and subdirectories. */
  const files: string[] = [];

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
 * @returns A list of all language codes.
 */
export function getLanguageCodes(): string[] {
  const languageCodes: string[] = [];

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
    failed(errStr);
    process.exit();
  }

  return languageCodes;
}

/**
 * Get the keys of a json file.
 * @param filePath - The path to the file to read
 * @returns The keys for the file.
 */
export function getKeys(filePath: string): string[] | null {
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
    failed(`Error parsing ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Get the keys from a JSON object.
 *
 * This function is used by {@linkcode getKeys} to get nested keys.
 * @param data - The json object to get the keys from
 * @returns The keys of the object, including nested keys.
 */
function getKeysByData(data: object): string[] {
  if (typeof data !== "object") {
    return [];
  }
  const keys: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    keys.push(key);
    if (typeof value === "object") {
      keys.push(...getKeysByData(value));
    }
  }
  return keys;
}

/** @returns The keys per file for the main language. */
export function getMainLanguageKeys(): FileKeys {
  const files = getFiles(mainLanguage);
  const mainLanguageKeys: FileKeys = {};

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

/**
 * Removes the language code from a file path.
 * @param filePath - The file path to process
 * @returns The file path without the language code.
 */
export function removeLanguageCode(filePath: string): string {
  const parts = filePath.split("/");
  const languageCodeIndex = parts.indexOf(LOCALES_DIR) + 1;
  return parts.slice(languageCodeIndex + 1).join("/");
}
