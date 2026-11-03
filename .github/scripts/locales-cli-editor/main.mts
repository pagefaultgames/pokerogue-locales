/*
 * SPDX-FileCopyrightText: 2025-2026 Pagefault Game
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
import { createInterface, type Key } from "node:readline";
import { input, search, select } from "@inquirer/prompts";
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
/** The version of this script */
const SCRIPT_VERSION = "1.1.0";

//#endregion Constants

//#region Helpers

/**
 * Get the list of string-valued keys in an object, recursing into nested objects.
 * Nested keys are joined with `.` (e.g. `"parent.child"`).
 * @param obj - The object to get keys from
 * @param prefix - The dotted path of `obj` within the root object
 * @returns The list of keys in the object
 */
function getLeafKeys(obj: object, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix + key;
    if (typeof val === "string") {
      keys.push(path);
    } else if (val && typeof val === "object") {
      keys.push(...getLeafKeys(val, path + "."));
    }
  }
  return keys;
}

/**
 * Returns a list of all string-valued keys in a locales file, including nested keys in dotted form.
 * @param filePath - The path to the locales file
 * @returns The list of keys in the file
 */
function getAllKeysFromFile(filePath: string): string[] {
  const data: object = JSON.parse(readFileSync(filePath, "utf8"));
  return getLeafKeys(data);
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
 * Delete a string key from a locales file. Keys holding nested objects are never deleted.
 * @param filePath - The path to the locales file
 * @param key - The key to delete
 * @returns Whether a matching string key was found and deleted
 */
function deleteKey(filePath: string, key: string): boolean {
  const data: Record<string, any> = JSON.parse(readFileSync(filePath, "utf8"));
  const parts = key.split(".");
  let obj = data;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj || typeof obj !== "object") {
      return false;
    }
  }
  // Never delete nested objects, only string values
  if (typeof obj[parts.at(-1)!] !== "string") {
    return false;
  }
  delete obj[parts.at(-1)!];
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

//#endregion Helpers

//#region Interactive CLI

/** Aborted when the user presses `Esc`, which cancels whichever prompt is active */
const escController = new AbortController();
/** The context passed to every prompt, so that `Esc` can cancel at any time */
const PROMPT_CONTEXT: { signal: AbortSignal } = { signal: escController.signal };
/**
 * How long to wait after `Esc` for the rest of an escape sequence (e.g. an arrow key) before treating it as `Esc`.
 * Node's default is 500ms, which makes `Esc` feel sluggish.
 */
const ESCAPE_CODE_TIMEOUT_MS = 50;

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
    await input(
      {
        message: `"${keyChoice} current reads:\n\t${value}\nEnter new value for "${keyChoice}" (press TAB to edit the placeholder):\n`,
        default: keyValue,
      },
      PROMPT_CONTEXT,
    ),
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

/** Sentinel choice value for going up a level in {@linkcode browse} */
const UP = Symbol("up");

/** An entry at one level of a tree browsed with {@linkcode browse} */
interface BrowseEntry {
  /** The name of the entry within its parent */
  name: string;
  /** Whether the entry can be entered (a folder or nested object) rather than picked */
  isBranch: boolean;
  /** Text shown below the entry while it is highlighted */
  description?: string;
}

/**
 * Interactively browse a tree one level at a time and pick a leaf.
 * Selecting a branch enters it, and selecting `..` goes back up a level.
 * @param options - The browsing options
 * @returns The name of the chosen leaf, or `undefined` if `..` was chosen at the top level
 */
async function browse(options: {
  /** What is being picked, shown in the prompt message */
  label: string;
  /** The separator used to display the current path */
  separator: string;
  /** Returns the entries at the given path */
  getEntries: (path: readonly string[]) => BrowseEntry[];
  /** The path to start at; updated in place to the parent of the chosen leaf */
  path: string[];
  /** Whether `..` is offered at the top level, to exit the browser */
  canExit?: boolean;
  /** The entry to highlight initially */
  returnTo?: string;
}): Promise<string | undefined> {
  const { label, separator, getEntries, path, canExit = false } = options;
  /** The branch just exited via `..`, so it can be highlighted instead of starting from the top */
  let returnTo = options.returnTo;
  let picked: string | typeof UP | undefined;
  while (picked === undefined) {
    const entries = getEntries(path).sort((a, b) => a.name.localeCompare(b.name));
    const showUp = canExit || path.length > 0;

    // Type to filter; whitespace-separated terms must all match
    const choice = await search<string | typeof UP>(
      {
        message: `Select ${label} (${path.length > 0 ? path.join(separator) : "top level"}):`,
        source: (term: string | undefined) => {
          const terms = term?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
          const matches = entries
            .filter((e) => terms.every((t) => e.name.toLowerCase().includes(t)))
            .map((e) => ({
              value: e.name,
              name: e.isBranch ? chalk.cyan(`${e.name}/`) : e.name,
              description: e.description,
            }));
          if (!showUp) {
            return matches;
          }
          // While filtering, list `..` last so the best match is highlighted instead
          const up: { value: typeof UP; name: string } = { value: UP, name: chalk.grey("..") };
          return terms.length > 0 ? [...matches, up] : [up, ...matches];
        },
        default: returnTo,
      },
      PROMPT_CONTEXT,
    );

    returnTo = undefined;
    if (choice === UP) {
      if (path.length === 0) {
        picked = UP;
      } else {
        returnTo = path.pop();
      }
    } else if (entries.find((e) => e.name === choice)?.isBranch) {
      path.push(choice);
    } else {
      picked = choice;
    }
  }
  return picked === UP ? undefined : picked;
}

/**
 * Get the subfolders and JSON files in a folder of the "en" locales.
 * @param path - The path of the folder, relative to the "en" locales folder
 * @returns The entries in the folder
 */
function getFileEntries(path: readonly string[]): BrowseEntry[] {
  return readdirSync(join(LOCALES_PATH, ...path), { withFileTypes: true })
    .filter((d) => d.isDirectory() || d.name.endsWith(".json"))
    .map((d) => ({ name: d.name, isBranch: d.isDirectory() }));
}

/**
 * Get the keys at one level of a parsed locales file.
 * @param data - The parsed locales file
 * @param path - The path of the nested object to list
 * @returns The string keys and nested objects in the object
 */
function getKeyEntries(data: Record<string, any>, path: readonly string[]): BrowseEntry[] {
  const node: Record<string, any> = path.reduce((obj, part) => obj[part], data);
  return Object.entries(node)
    .filter(([, val]) => typeof val === "string" || (val && typeof val === "object"))
    .map(([key, val]) =>
      typeof val === "string"
        ? { name: key, isBranch: false, description: escapeSpecialChars(val) }
        : { name: key, isBranch: true },
    );
}

/**
 * Interactively pick a locales file, then a key within it, then what to do with that key.
 * Choosing `..` at a file's top level goes back to the file picker, and choosing "Back"
 * from the actions goes back to the key picker.
 * @returns The chosen file (relative to the "en" locales folder), the dotted path of the chosen key, and the chosen action
 */
async function pickFileKeyAndAction(): Promise<{
  fileChoice: string;
  keyChoice: string;
  action: "Reword" | "Delete" | "Cancel";
}> {
  const dirPath: string[] = [];
  let fileReturnTo: string | undefined;
  for (;;) {
    // Step 1: Select file. The file browser has no `..` at the top level, so it always returns a file.
    const fileName = (await browse({
      label: "a locales file to manage",
      separator: "/",
      getEntries: getFileEntries,
      path: dirPath,
      returnTo: fileReturnTo,
    }))!;
    fileReturnTo = fileName;
    const fileChoice = join(...dirPath, fileName);

    const filePath = join(LOCALES_PATH, fileChoice);
    if (getAllKeysFromFile(filePath).length === 0) {
      console.error(chalk.red.bold("✗ Error: No keys found in file."));
      continue;
    }

    const data = JSON.parse(readFileSync(filePath, "utf8"));
    const keyPath: string[] = [];
    let keyReturnTo: string | undefined;
    for (;;) {
      // Step 2: Select key
      const keyName = await browse({
        label: "a key to reword or delete",
        separator: ".",
        getEntries: (path: readonly string[]) => getKeyEntries(data, path),
        path: keyPath,
        canExit: true,
        returnTo: keyReturnTo,
      });
      if (keyName === undefined) {
        // `..` at the top level: go back to the file picker
        break;
      }
      const keyChoice = [...keyPath, keyName].join(".");

      // Step 3: Choose action
      const action = await select(
        {
          message: `What would you like to do with "${keyChoice}"?`,
          choices: ["Reword", "Delete", "Back", "Cancel"] as const,
        },
        PROMPT_CONTEXT,
      );
      if (action !== "Back") {
        return { fileChoice, keyChoice, action };
      }
      keyReturnTo = keyName;
    }
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log(`Locales Key Deleter - v${SCRIPT_VERSION}`);
    return process.exit(0);
  }

  console.group(chalk.grey(`🌐 Manage Locales - v${SCRIPT_VERSION} (press Esc to cancel at any time)\n`));

  const onKeypress = (_: string | undefined, key: Key | undefined): void => {
    if (key?.name === "escape") {
      escController.abort();
    }
  };
  // Creating a terminal interface installs stdin's keypress decoder with our escape timeout. The decoder is only
  // installed once per stream and outlives the interface, so this must run before any prompt creates its own.
  createInterface({ input: process.stdin, terminal: true, escapeCodeTimeout: ESCAPE_CODE_TIMEOUT_MS }).close();
  process.stdin.on("keypress", onKeypress);

  try {
    const { fileChoice, keyChoice, action } = await pickFileKeyAndAction();

    const filePath = join(LOCALES_PATH, fileChoice);
    let keyValue = getKeyValue(filePath, keyChoice);
    if (keyValue === undefined) {
      console.error(chalk.red.bold(`✗ Error: Editing non-string keys (${keyChoice}) is not yet supported!`));
      return;
    }
    keyValue = escapeSpecialChars(keyValue);

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
    // Thrown when a prompt is cancelled with `Esc` or `Ctrl+C`
    if (err instanceof Error && (err.name === "AbortPromptError" || err.name === "ExitPromptError")) {
      console.log(chalk.yellow("Operation cancelled."));
    } else {
      console.error(chalk.red("✗ Error: ", err));
    }
  } finally {
    process.stdin.off("keypress", onKeypress);
  }
}

await main();

//#endregion Interactive CLI
