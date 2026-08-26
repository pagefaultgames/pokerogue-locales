/** @import { Format } from "./types.js" */

/** The directory containing all locales files. */
export const LOCALES_DIR = ".";

/** A list of files to ignore. */
export const ignoreList = [
  "package.json",
  "biome.jsonc",
  "tsconfig.json",
  "modifier-type.json", // todo: remove after modifier rework
  "modifier.json",
  "modifier-select-ui-handler.json",
  ".git",
  ".github",
  ".gitignore",
  "node_modules",
  ".vscode",
  "README.md",
  "pnpm-lock.yaml",
  "scripts",
  "LICENSE",
];

/**
 * A list of built-in i18next key extensions which use snake_case instead of camelCase.
 * @example `AceTrainer_male`
 * @see {@link https://www.i18next.com/translation-function/context}
 */
export const i18nextKeyExtensions = ["_male", "_female", "_ordinal", "_one", "_two", "_other", "_few"];

/**
 * The key format to check for.
 * @type {Format}
 */
export const keyFormat = "camelCase";

/**
 * The file name format to check for.
 * @type {Format}
 */
export const fileNameFormat = "kebab-case";

/** The file extension to check. */
export const fileExtension = ".json";

/** The main language code. Used to check if the key exists in the main language. */
export const mainLanguage = "en";

/** 24 bit Color map of ANSI color codes */
export const COLORS = {
  blue: "\u001b[38;2;0;0;255m",
  green: "\u001b[38;2;0;255;0m",
  red: "\u001b[38;2;255;0;0m",
  magenta: "\u001b[38;2;136;23;152m",
  info: "\u001b[38;2;255;165;0m",
  file: "\u001b[38;2;128;128;128m",
  corrected: "\u001b[38;2;0;150;255m",
  "orange-red": "\u001b[38;2;255;127;80m",
  reset: "\u001b[0m",
};
