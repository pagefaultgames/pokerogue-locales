/*
 * SPDX-FileCopyrightText: 2025 Pagefault Game
 * SPDX-FileContributor: SirzBenjie
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Interactive CLI to reword or delete locales keys for the "en" file.
 * Usage: `node ./.github/scripts/locales-cli-editor/main.mts`
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";

//#region Constants

/** The path to the root of the locales directory */
const LOCALES_DIR = resolve(import.meta.dirname, "../../../");
/** The language code to edit */
const LANG_CODE = "en";
/** The path to the English locales folder */
const LOCALES_PATH = join(LOCALES_DIR, LANG_CODE);
/** The list of supported languages */
const SUPPORTED_LANGS: readonly string[] = readdirSync(LOCALES_DIR) //
  .filter((f) => f !== "en" && statSync(join(LOCALES_DIR, f)).isDirectory());
/** The list of JSON files that can be edited */
const LOCALES_FILES: readonly string[] = readdirSync(LOCALES_PATH).filter((f) => f.endsWith(".json"));
/** The version of this script */
const SCRIPT_VERSION = "1.0.0";

//#endregion Constants

//#region Helpers

/**
 * Get the flat list of keys in an object, skipping nested objects.
 * @param obj - The object to get keys from
 * @returns The list of keys in the object
 */
function getFlatKeys(obj: object): string[] {
  const keys: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Returns a list of all top-level keys in a locales file, skipping keys that hold nested objects.
 * @param filePath - The path to the locales file
 * @returns The list of keys in the file
 */
function getAllKeysFromFile(filePath: string): string[] {
  const data: object = JSON.parse(readFileSync(filePath, "utf8"));
  return getFlatKeys(data);
}

/**
 * Get the value of a key from the provided locales file.
 * @param filePath - The path to the locales file
 * @param key - The key to get the value of
 * @returns The value of the key, or `undefined` if the key either does not exist or is not a string
 */
function getKeyValue(filePath: string, key: string): string | undefined {
  const data: Record<string, any> = JSON.parse(readFileSync(filePath, "utf8"));
  const parts = key.split(".");
  let val = data;
  for (const part of parts) {
    if (val && typeof val === "object" && part in val) {
      val = val[part];
    } else {
      return;
    }
  }
  return typeof val === "string" ? val : undefined;
}

/**
 * Update the value of a key in a locales file.
 * @param filePath - The path to the locales file to edit
 * @param key - The name of the key to set
 * @param value - The value to set the key to
 * @returns Whether the key was set
 */
function setKeyValue(filePath: string, key: string, value: string): boolean {
  const data: Record<string, any> = JSON.parse(readFileSync(filePath, "utf8"));
  const parts = key.split(".");
  let obj = data;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj) {
      return false;
    }
  }
  obj[parts.at(-1)!] = value;
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

/**
 * Delete a key from a locales file.
 * @param filePath - The path to the locales file
 * @param key - The key to delete
 * @returns Whether a matching key was found and deleted
 */
function deleteKey(filePath: string, key: string): boolean {
  const data: Record<string, any> = JSON.parse(readFileSync(filePath, "utf8"));
  const parts = key.split(".");
  let obj = data;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj) {
      return false;
    }
  }
  delete obj[parts.at(-1)!];
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

//#endregion Helpers

//#region Interactive CLI

/**
 * Escape special characters in a string to display them literally in the CLI.
 * @param str - The string to escape
 * @returns The string with special characters escaped
 */
function escapeSpecialChars(str: string): string {
  return str.replace(/[\n\r\t]/g, (c) => {
    switch (c) {
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\t":
        return "\\t";
      default:
        return c;
    }
  });
}

/**
 * Convert escaped special characters back to their original form and convert
 * normal quotes to the special quote characters.
 * @param str - The string to unescape and postprocess
 * @returns The unescaped and postprocessed string
 */
function unescapeSpecialCharsAndConvertQuotes(str: string): string {
  // biome-ignore format: the extra parentheses are unnecessary
  return str
    .replace(/(?<!\s)'(?=\S)/g, "’")
    // Replace double quotes that appear after a space (or the beginning of the string) with special left quote
    .replace(/(?<=\s|^)"(?=^|\S)/g, "“")
    // Replace double quotes that appear after a non-space and are not followed by a non-dot with special right quote
    .replace(/(?<=\S)"/g, "”")
    // Unescape special escaped characters
    .replace(/\\[nrt]/g, (c) => {
      switch (c) {
        case "\\n":
          return "\n";
        case "\\r":
          return "\r";
        case "\\t":
          return "\t";
        default:
          return c;
      }
    });
}

/**
 * Handler for the "Reword" action - rewords the key in "en" and deletes it from
 * all other locale files.
 * @param fileChoice - The locales file to edit
 * @param keyChoice - The key to reword
 * @param keyValue - The current value of the key
 */
async function reword(fileChoice: string, keyChoice: string, keyValue: string): Promise<void> {
  const value = chalk.red(escapeSpecialChars(keyValue));
  const newValue = unescapeSpecialCharsAndConvertQuotes(
    await input({
      message: `"${keyChoice} current reads:\n\t${value}\nEnter new value for "${keyChoice}" (press TAB to edit the placeholder):\n`,
      default: keyValue,
    }),
  );

  if (newValue.trim().length === 0) {
    console.error(chalk.red.bold("✗  New value cannot be empty."));
    process.exitCode = 1;
    return;
  }

  const enFilePath = join(LOCALES_DIR, "en", fileChoice);
  setKeyValue(enFilePath, keyChoice, newValue);

  deleteNonEnglishKeys(fileChoice, keyChoice);
  console.log(chalk.green(`✔ Key "${keyChoice}" reworded in "en" and removed from all other files.`));
}

/**
 * Deletes a key from all non-English locale files.
 * @param fileChoice - The locales file to edit
 * @param keyChoice - The key to delete
 */
function deleteNonEnglishKeys(fileChoice: string, keyChoice: string): void {
  for (const lang of SUPPORTED_LANGS) {
    const langFilePath = join(LOCALES_DIR, lang, fileChoice);
    if (existsSync(langFilePath)) {
      deleteKey(langFilePath, keyChoice);
    }
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log(`Locales Key Deleter - v${SCRIPT_VERSION}`);
    return process.exit(0);
  }

  console.group(chalk.grey(`🌐 Manage Locales - v${SCRIPT_VERSION}\n`));

  try {
    // Step 1: Select file
    const fileChoice = await select({
      message: "Select a locales file to manage:",
      choices: LOCALES_FILES,
    });

    const filePath = join(LOCALES_PATH, fileChoice);
    const allKeys = getAllKeysFromFile(filePath);

    if (allKeys.length === 0) {
      console.error(
        chalk.red.bold("✗ Error: No keys found in file. This can happen if the file contains only nested objects."),
      );
      return;
    }

    const keyChoice = await select({
      message: "Select a key to reword or delete:",
      choices: allKeys.sort(),
    });

    let keyValue = getKeyValue(filePath, keyChoice);
    if (keyValue === undefined) {
      console.error(chalk.red.bold(`✗ Error: Editing non-string keys (${keyChoice}) is not yet supported!`));
      return;
    }
    keyValue = escapeSpecialChars(keyValue);

    // Step 3: Choose action
    const action = await select({
      message: `What would you like to do with "${keyChoice}"?`,
      choices: ["Reword", "Delete", "Cancel"] as const,
    });

    switch (action) {
      case "Reword":
        await reword(fileChoice, keyChoice, keyValue);
        break;
      case "Delete":
        deleteNonEnglishKeys(fileChoice, keyChoice);
        break;
      case "Cancel":
        console.log(chalk.yellow("Operation cancelled."));
        return;
    }

    console.groupEnd();
  } catch (err) {
    console.error(chalk.red("✗ Error: ", err));
  }
}

await main();

//#endregion Interactive CLI
