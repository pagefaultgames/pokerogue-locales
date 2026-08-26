import { endGroup } from "@actions/core";
import { checkLocaleFileNames, checkLocaleKeys, checkLocaleMissingKeys } from "./check-locales.mts";
import { COLORS, mainLanguage } from "./constants.mts";
import { getLanguageCodes } from "./get-files.mts";
import type { FileKeys, IncorrectFileName, IncorrectFileNames, IncorrectKeys, Options } from "./types.mts";
import { failed, logInfo, logStartGroup } from "./utils.mts";

/**
 * This script will check the key format of locales files.
 *
 * Usage: `pnpm check-locales <options> [languages]`
 *
 * @example
 * `pnpm check-locales -k -f en de fr` will check the key and file name format
 * of the English, German, and French locales.
 *
 * @remarks
 * If no languages are provided, it will check all languages.
 *
 * @packageDocumentation
 */

/** Script version */
const VERSION = "1.0.0";

async function main(): Promise<void> {
  logInfo(COLORS["orange-red"], `🍳 Locales format checker v${VERSION}`);

  try {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (!options.checkKeys && !options.checkFileNames && !options.checkMissing) {
      failed("✗ Error: No options provided!");
      return;
    }

    let keyOutput: IncorrectKeys = {};
    let fileNameOutput: IncorrectFileNames = {};
    let mainLanguageMissingKeys: FileKeys = {};

    if (options.checkKeys) {
      logInfo(COLORS.info, "Checking key format...");
      keyOutput = checkLocaleKeys(options);
    }

    if (options.checkFileNames) {
      logInfo(COLORS.info, "Checking file name format...");
      fileNameOutput = checkLocaleFileNames(options);
    }

    if (options.checkMissing) {
      logInfo(COLORS.info, "Checking for missing keys...");
      mainLanguageMissingKeys = checkLocaleMissingKeys(options);
    }

    if (options.checkKeys) {
      displayKeyResults(keyOutput, options);
    }

    if (options.checkFileNames) {
      displayFileNameResults(fileNameOutput, options);
    }

    if (options.checkMissing) {
      displayMissingResult(mainLanguageMissingKeys, options);
    }
  } catch (error) {
    failed(error.message);
  }
}

/**
 * Parse the command line arguments.
 * @param args - The command line arguments
 * @returns The parsed options
 */
function parseArgs(args: string[]): Options {
  const optionArgs = args.filter((arg) => arg.startsWith("-"));
  const languageArgs = args.filter((arg) => !arg.startsWith("-"));
  const options: Options = {
    checkKeys: false,
    checkFileNames: false,
    checkMissing: false,
    verbose: false,
    languages: [],
  };

  for (const arg of optionArgs) {
    switch (arg) {
      case "-k":
      case "--keys":
        options.checkKeys = true;
        break;
      case "-f":
      case "--filenames":
        options.checkFileNames = true;
        break;
      case "-m":
      case "--missing":
        options.checkMissing = true;
        break;
      case "-v":
      case "--verbose":
        options.verbose = true;
        break;
      default:
        failed(`Unknown option: ${arg}`);
        // showHelpText(); // <-- this function doesn't exist
        process.exit();
    }
  }

  const validLanguages = getLanguageCodes();
  for (const language of languageArgs) {
    if (!validLanguages.includes(language)) {
      failed(`Invalid language: ${language}`);
      process.exit();
    }
    options.languages.push(language);
  }
  if (options.languages.length === 0) {
    // get all languages if none are specified
    options.languages = getLanguageCodes();
  }
  return options;
}

/**
 * Display the results for the key format check.
 * @param result - The incorrect keys found.
 * @param options - The options used.
 */
function displayKeyResults(result: IncorrectKeys, options: Options): void {
  logInfo(COLORS.info, "Key Result:");

  if (Object.keys(result).length > 0) {
    failed("Found incorrect keys");
    // Log incorrect keys per language
    for (const languageCode of options.languages) {
      const incorrectKeysForLang = Object.entries(result).filter(([path]) => path.includes(`/${languageCode}/`));
      const incorrectKeysCount = incorrectKeysForLang.reduce((sum, [_, val]) => sum + val.length, 0);
      const color = incorrectKeysCount > 0 ? COLORS.red : COLORS.green;

      logStartGroup(color, `Result for ${languageCode}`);
      logInfo(color, `${languageCode}: ${incorrectKeysCount} incorrect keys`);
      // log all incorrect keys for the language
      displayIncorrectKeys(languageCode, Object.fromEntries(incorrectKeysForLang));
      endGroup();
    }
    const incorrectKeyCount = Object.values(result).reduce((sum, val) => sum + val.length, 0);
    failed(`✗ Found ${incorrectKeyCount} incorrect keys in ${options.languages.length} languages.`);
  } else {
    logInfo(COLORS.green, "✔ No incorrect keys found!");
    process.exitCode = 0;
  }
}

/**
 * Display the results for the file name format check.
 * @param result - The incorrect keys found.
 * @param options - The options used.
 */
function displayFileNameResults(result: IncorrectFileNames, options: Options): void {
  logInfo(COLORS.info, "File Name Result:");

  if (Object.keys(result).length > 0) {
    failed("Found incorrect file names");
    // Log incorrect file names per language
    for (const languageCode of options.languages) {
      const incorrectFileNamesForLang = result[languageCode];
      if (!incorrectFileNamesForLang) {
        continue;
      }
      const color = incorrectFileNamesForLang.length > 0 ? COLORS.red : COLORS.green;

      logStartGroup(color, `Result for ${languageCode}`);
      logInfo(color, `${languageCode}: ${incorrectFileNamesForLang.length} incorrect file names`);
      displayIncorrectFileNames(incorrectFileNamesForLang);
      endGroup();
    }
    const incorrectFileNameCount = Object.values(result).reduce((sum, val) => sum + val.length, 0);
    failed(`✗ Found ${incorrectFileNameCount} incorrect file names in ${options.languages.length} languages.`);
  } else {
    logInfo(COLORS.green, "✔ No incorrect file names found!");
    process.exitCode = 0;
  }
}

/**
 * Display the incorrect keys for a language.
 * @param languageCode - The language code.
 * @param incorrectKeysForLang - The incorrect keys for the language.
 */
function displayIncorrectKeys(languageCode: string, incorrectKeysForLang: IncorrectKeys): void {
  if (Object.keys(incorrectKeysForLang).length <= 0) {
    return;
  }

  for (const [filePath, incorrectKeys] of Object.entries(incorrectKeysForLang)) {
    if (!filePath.includes(`/${languageCode}/`)) {
      continue;
    }
    // log the filepath
    logInfo(COLORS.file, `File: ${filePath}`);
    for (const incorrectKey of incorrectKeys) {
      logInfo(COLORS.red, `Incorrect key found at line ${incorrectKey.line}: ${incorrectKey.incorrectKey}`);
      logInfo(COLORS.corrected, `Correct key: ${incorrectKey.correctedKey}`);
    }
  }
}

/**
 * Display the incorrect keys for a language.
 * @param incorrectFileNamesForLang - The incorrect file names for the language.
 */
function displayIncorrectFileNames(incorrectFileNamesForLang: IncorrectFileName[]): void {
  if (incorrectFileNamesForLang.length <= 0) {
    return;
  }

  for (const incorrectFileName of incorrectFileNamesForLang) {
    logInfo(COLORS.red, `Incorrect file name: ${incorrectFileName.incorrectFileName}`);
    logInfo(COLORS.corrected, `Correct file name: ${incorrectFileName.correctedFileName}`);
  }
}

/**
 * Display the results for the missing key format check.
 * @param result - The missing keys found.
 * @param options - The options used.
 */
function displayMissingResult(result: FileKeys, options: Options): void {
  logInfo(COLORS.info, "Missing keys Result:");

  if (Object.keys(result).length > 0) {
    failed("Found missing keys");
    // Log missing keys per language
    for (const languageCode of options.languages) {
      if (languageCode === mainLanguage) {
        continue;
      }

      const missingKeysForLang = Object.entries(result).filter(([path]) => path.includes(`/${languageCode}/`));
      const incorrectKeysCount = missingKeysForLang.reduce((sum, [_, val]) => sum + val.length, 0);
      const color = incorrectKeysCount > 0 ? COLORS.red : COLORS.green;

      logStartGroup(color, `Result for ${languageCode}`);
      logInfo(color, `${languageCode}: ${incorrectKeysCount} missing keys`);
      // log all missing keys for the language
      displayMissingKeys(languageCode, Object.fromEntries(missingKeysForLang));
      endGroup();
    }
    const missingKeyCount = Object.values(result).reduce((sum, val) => sum + val.length, 0);
    failed(`✗ Found ${missingKeyCount} missing keys in ${options.languages.length} languages.`);
  } else {
    logInfo(COLORS.green, "✔ No missing keys found!");
    process.exitCode = 0;
  }
}

/**
 * Display the missing keys for a language.
 * @param languageCode - The language code.
 * @param missingKeysForLang - The missing keys for the language.
 */
function displayMissingKeys(languageCode: string, missingKeysForLang: FileKeys): void {
  if (Object.keys(missingKeysForLang).length <= 0) {
    return;
  }

  for (const [filePath, missingKeys] of Object.entries(missingKeysForLang)) {
    if (!filePath.includes(`/${languageCode}/`)) {
      continue;
    }
    // log the filepath
    logInfo(COLORS.file, `File: ${filePath}`);
    for (const missing of missingKeys) {
      logInfo(COLORS.red, `Missing key found: ${missing}`);
    }
  }
}

await main();
