/*
 * SPDX-FileCopyrightText: 2025 Pagefault Game
 * SPDX-FileContributor: SirzBenjie
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Interactive CLI to reword or delete locales keys for the "en" file.
 * Usage: `node scripts/manage-locales.js`
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

//#region Constants

const __dirname = dirname(fileURLToPath(import.meta.url));
/** The path to the root of the locales directory */
const LOCALES_DIR = resolve(__dirname, "../../../");
/** The language code to edit */
const LANG_CODE = "en";
/** */
const LOCALES_PATH = path.join(LOCALES_DIR, LANG_CODE);
/**
 * The list of supported languages
 * @type {readonly string[]}
 */
const SUPPORTED_LANGS = fs
  .readdirSync(LOCALES_DIR)
  .filter(f => f !== "en" && fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());
/**
 * The list of JSON files that can be edited
 * @type readonly string[]
 */
const LOCALES_FILES = fs.readdirSync(LOCALES_PATH).filter(f => f.endsWith(".json"));
/**
 * The version of this script
 * @type {string}
 */
const SCRIPT_VERSION = "1.0.0";

//#endregion

//#region Helpers

/**
 * Get the flat list of keys in an object, skipping nested objects.
 * @param {object} obj
 * @param {string} prefix
 * @returns {string[]} The list of keys in the object
 */
function getFlatKeys(obj) {
  /** @type {string[]} */
  const keys = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Return a list of all top-level keys in a locales file, skipping keys that hold nested objects
 * @param {string} filePath
 * @returns {string[]} The list of keys in the file
 */
function getAllKeysFromFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return getFlatKeys(data);
}

function getKeyValue(filePath, key) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const parts = key.split(".");
  let val = data;
  for (const part of parts) {
    if (val && typeof val === "object" && part in val) {
      val = val[part];
    } else {
      return undefined;
    }
  }
  return typeof val === "string" ? val : undefined;
}

/**
 * Update the value of a key in a locales file.
 * @param {string} filePath The path to the locales file to edit
 * @param {string} key The name of the key to set
 * @param {string} value The value to set the key to
 * @returns {boolean} `true` if the key was set, `false` otherwise
 */
function setKeyValue(filePath, key, value) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const parts = key.split(".");
  let obj = data;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj) return false;
  }
  obj[parts[parts.length - 1]] = value;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

/**
 * Delete a key from a locales file.
 * @param {string} filePath
 * @param {string} key
 * @returns `true` if a matching key was found and deleted, `false` otherwise
 */
function deleteKey(filePath, key) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const parts = key.split(".");
  let obj = data;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj) return false;
  }
  delete obj[parts[parts.length - 1]];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

//#endregion

//#region Interactive CLI

/**
 *
 * @param {string} str
 * @returns - The string with special characters escaped
 */
function escapeSpecialChars(str) {
  return str.replace(/[\n\r\t]/g, c => {
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
 * Reword a key in "en" and delete it from all other locale files.
 * @param {string} fileChoice The locales file to edit
 * @param {string} keyChoice The key to reword
 * @param {string} keyValue The current value of the key
 * @returns {Promise<void>}
 */
async function reword(fileChoice, keyChoice, keyValue) {
  /** @type string */
  const value = chalk.red(escapeSpecialChars(keyValue));
  let newValue = (
    await inquirer.prompt([
      {
        type: "input",
        name: "newValue",
        message: `"${keyChoice} current reads:\n\t${value}\nEnter new value for "${keyChoice}" (press TAB to edit the placeholder):\n`,
        default: keyValue,
      },
    ])
  ).newValue
    // Postprocess the value to replace single quotes that do not have a whitespace before them with the special quote character
    .replace(/(?<!\s)'(?=\S)/g, "’")
    // Replace double quotes that appear after a space (or the beginning of the string) with special left quote
    .replace(/(?<=\s|^)"(?=^|\S)/g, "“")
    // Replace double quotes that appear after a non-space and are not followed by a non-dot with special right quote
    .replace(/(?<=\S)"/g, "”")
    // Unescape special escaped characters
    .replace(/\\[nrt]/g, c => {
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

  if (newValue.trim().length === 0) {
    console.error(chalk.red("✗ Error: New value cannot be empty."));
    return;
  }

  const enFilePath = path.join(LOCALES_DIR, "en", fileChoice);
  setKeyValue(enFilePath, keyChoice, newValue);

  for (const lang of SUPPORTED_LANGS) {
    const langFilePath = path.join(LOCALES_DIR, lang, fileChoice);
    if (fs.existsSync(langFilePath)) {
      deleteKey(langFilePath, keyChoice, newValue);
    }
  }
  console.log(chalk.green(`✔ Key "${keyChoice}" reworded in "en" and removed from all other files.`));
}

/**
 * Handler for when the user chooses the "Delete" action
 *
 * @remarks
 * Deletes the key from all locale files.
 * @param {string} fileChoice The locales file to edit
 * @param {string} keyChoice The key to delete
 * @returns {Promise<void>}
 */
async function doDelete(fileChoice, keyChoice) {
  for (const lang of SUPPORTED_LANGS) {
    const langFilePath = path.join(LOCALES_DIR, lang, fileChoice);
    if (fs.existsSync(langFilePath)) {
      deleteKey(langFilePath, keyChoice);
    }
  }
}

async function main() {
  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log(`Locales Key Deleter - v${SCRIPT_VERSION}`);
    return process.exit(0);
  }

  console.group(chalk.grey(`🌐 Manage Locales - v${SCRIPT_VERSION}\n`));

  try {
    // Step 1: Select file
    /** @type {string} */
    const fileChoice = (
      await inquirer.prompt([
        {
          type: "list",
          name: "selectedFile",
          message: "Select a locales file to manage:",
          choices: LOCALES_FILES,
        },
      ])
    ).selectedFile;

    const filePath = path.join(LOCALES_PATH, fileChoice);
    const allKeys = getAllKeysFromFile(filePath);

    /** @type {string} */
    const keyChoice = (
      await inquirer.prompt([
        {
          type: "list",
          name: "selectedKey",
          message: "Select a key to reword or delete:",
          choices: allKeys.sort(),
        },
      ])
    ).selectedKey;

    let keyValue = getKeyValue(filePath, keyChoice);
    if (keyValue === undefined) {
      console.error(chalk.red(`✗ Error: Editing non-string keys (${keyChoice}) is not yet supported!.`));
      return;
    }
    keyValue = escapeSpecialChars(keyValue);

    // Step 3: Choose action
    /** @type string */
    const action = (
      await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: `What would you like to do with "${keyChoice}"?`,
          choices: ["Reword", "Delete", "Cancel"],
        },
      ])
    ).action;

    switch (action) {
      case "Reword":
        await reword(fileChoice, keyChoice, keyValue);
        break;
      case "Delete":
        await doDelete(fileChoice, keyChoice);
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

//#endregion
