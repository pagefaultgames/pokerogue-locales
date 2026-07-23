// #region String splitting

// Regexps involved with splitting words in various case formats.
// Sourced from https://www.npmjs.com/package/change-case (with slight tweaking here and there)

/**
 * Regex to split at word boundaries.
 * @type {RegExp}
 */
const SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
/**
 * Regex to split around single-letter uppercase words.
 * @type {RegExp}
 */
const SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
/**
 * Regexp involved with stripping non-word delimiters from the result.
 * @type {RegExp}
 */
const DELIM_STRIP_REGEXP = /[-_ ]+/giu;
// The replacement value for splits.
const SPLIT_REPLACE_VALUE = "$1\0$2";

/**
 * Split any cased string into an array of its constituent words.
 * @param {string} value - The string to be split
 * @returns {string[]} The new string, delimited at each instance of one or more spaces, underscores, hyphens
 * or lower-to-upper boundaries.
 */
function splitWords(value) {
  let result = value.trim();
  result = result.replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE).replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
  result = result.replace(DELIM_STRIP_REGEXP, "\0");

  // Trim the delimiter from around the output string
  return trimFromStartAndEnd(result, "\0").split(/\0/g);
}

/**
 * Helper function to remove one or more sequences of characters from either end of a string.
 * @param {string} str - The string to replace
 * @param {string} charToTrim - The string to remove
 * @returns {string} The result of removing all instances of {@linkcode charToTrim} from either end of {@linkcode str}.
 */
function trimFromStartAndEnd(str, charToTrim) {
  let start = 0;
  let end = str.length;
  const blockLength = charToTrim.length;

  while (str.startsWith(charToTrim, start)) {
    start += blockLength;
  }
  if (start - end === blockLength) {
    // Occurs if the ENTIRE string is made up of charToTrim (at which point we return nothing)
    return "";
  }
  while (str.endsWith(charToTrim, end)) {
    end -= blockLength;
  }
  return str.slice(start, end);
}

// #endregion String splitting

// #region String casing

/**
 * Capitalize the first letter of a string.
 * @param {string} str - The string whose first letter is to be capitalized
 * @returns {string} The original string with its first letter capitalized.
 * @example
 * ```ts
 * console.log(capitalizeFirstLetter("consectetur adipiscing elit")); // returns "Consectetur adipiscing elit"
 * ```
 */
export function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalize the first letter of a string, and make the rest lowercase.
 * @param {string} str - The string to transform
 * @returns {string} The original string with all letters lowercase except the first which is capitalized
 * @example
 * ```ts
 * console.log(capitalizeFirstLetterOnly("WATER")); // prints "Water"
 * ```
 */
export function capitalizeFirstLetterOnly(str) {
  return capitalizeFirstLetter(str.toLowerCase());
}

/**
 * Helper method to convert a string into `Title Case` (such as one used for console logs).
 * @param {string} str - The string being converted
 * @returns {string} The result of converting `str` into title case.
 * @example
 * ```ts
 * console.log(toTitleCase("lorem ipsum dolor sit amet")); // returns "Lorem Ipsum Dolor Sit Amet"
 * ```
 */
export function toTitleCase(str) {
  return splitWords(str)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Helper method to convert a string into `camelCase` (such as one used for i18n keys).
 * @param {string} str - The string being converted
 * @returns {string} The result of converting `str` into camel case.
 * @example
 * ```ts
 * console.log(toCamelCase("BIG_ANGRY_TRAINER")); // returns "bigAngryTrainer"
 * ```
 */
export function toCamelCase(str) {
  return splitWords(str)
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

/**
 * Helper method to convert a string into `PascalCase`.
 * @param {string} str - The string being converted
 * @returns {string} The result of converting `str` into pascal case.
 * @example
 * ```ts
 * console.log(toPascalCase("hi how was your day")); // returns "HiHowWasYourDay"
 * ```
 */
export function toPascalCase(str) {
  return splitWords(str)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Helper method to convert a string into `kebab-case` (such as one used for filenames).
 * @param {string} str - The string being converted
 * @returns {string} The result of converting `str` into kebab case.
 * @example
 * ```ts
 * console.log(toKebabCase("not_kebab-caSe String")); // returns "not-kebab-case-string"
 * ```
 */
export function toKebabCase(str) {
  return splitWords(str)
    .map((word) => word.toLowerCase())
    .join("-");
}

/**
 * Helper method to convert a string into `snake_case` (such as one used for filenames).
 * @param {string} str - The string being converted
 * @returns {string} The result of converting `str` into snake case.
 * @example
 * ```ts
 * console.log(toSnakeCase("not-in snake_CaSe")); // returns "not_in_snake_case"
 * ```
 */
export function toSnakeCase(str) {
  return splitWords(str)
    .map((word) => word.toLowerCase())
    .join("_");
}

/**
 * Helper method to convert a string into `UPPER_SNAKE_CASE`.
 * @param {string} str - The string being converted
 * @returns {string} The result of converting `str` into upper snake case.
 * @example
 * ```ts
 * console.log(toUpperSnakeCase("apples bananas_oranGes-PearS")); // returns "APPLES_BANANAS_ORANGES_PEARS"
 * ```
 */
export function toUpperSnakeCase(str) {
  return splitWords(str)
    .map((word) => word.toUpperCase())
    .join("_");
}

/**
 * Helper method to convert a string into `Pascal_Snake_Case`.
 * @param {string} str - The string being converted
 * @returns {string} The result of converting `str` into pascal snake case.
 * @example
 * ```ts
 * console.log(toPascalSnakeCase("apples-bananas_oranGes Pears")); // returns "Apples_Bananas_Oranges_Pears"
 * ```
 */
export function toPascalSnakeCase(str) {
  return splitWords(str)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("_");
}

// #endregion String casing

/**
 * Chunk a string into an array, creating a new element every `length` characters.
 * @param {string} str - The string to chunk
 * @param {number} length - The length of each chunk; should be a non-negative integer
 * @returns {string[]} The result of splitting `str` after every instance of `length` characters.
 * @example
 * ```ts
 * console.log(chunkString("123456789abc", 4)); // Output: ["1234", "5678", "9abc"]
 * console.log(chunkString("1234567890", 4)); // Output: ["1234", "5678", "90"]
 * ```
 */
export function chunkString(str, length) {
  const numChunks = Math.ceil(str.length / length);
  const chunks = new Array(numChunks);

  for (let i = 0; i < numChunks; i++) {
    chunks[i] = str.slice(i * length, (i + 1) * length);
  }

  return chunks;
}
