/**
 * The directory containing all locales files.
 */
export const LOCALES_DIR = ".";
/**
 * A list of files to ignore.
 * @type {string[]}
 */
export const ignoreList = [
  "package.json",
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
  "LICENSE"
];
/**
 * A list of inbuild i18next key extensions which use snake_case instead of camelCase.
 * @example `AceTrainer_male`
 * @link https://www.i18next.com/translation-function/context
 * @returns {string[]}
 */
export const i18nextKeyExtensions = ["_male", "_female", "_ordinal", "_one", "_two", "_other", "_few"];

/**
 * The key format to check for.
 * @type {format}
 */
export const keyFormat = "camelCase";

/**
 * The file name format to check for.
 * @type {format}
 */
export const fileNameFormat = "kebab-case";

/**
 * The file extension to check.
 */
export const fileExtension = ".json";

/**
 * 24 bit Color map
 */
export const COLORS = {
  "blue": "\u001b[38;2;0;0;255m",
  "green": "\u001b[38;2;0;255;0m",
  "red": "\u001b[38;2;255;0;0m",
  "magenta": "\u001b[38;2;136;23;152m",
  "info": "\u001b[38;2;255;165;0m",
  "file": "\u001b[38;2;128;128;128m",
  "corrected": "\u001b[38;2;0;150;255m",
}