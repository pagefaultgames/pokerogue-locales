export type IncorrectKey = { incorrectKey: string; correctedKey: string; line: number };

export type IncorrectKeys = Record<string, IncorrectKey[]>;

export type Options = {
  checkKeys: boolean;
  checkFileNames: boolean;
  checkMissing: boolean;
  verbose: boolean;
  languages: string[];
};

export type IncorrectFileName = { incorrectFileName: string; correctedFileName: string };

export type IncorrectFileNames = Record<string, IncorrectFileName[]>;

export type FileKeys = Record<string, string[]>;

export type Format =
  | "camelCase"
  | "kebab-case"
  | "PascalCase"
  | "snake_case"
  | "UPPER_SNAKE_CASE"
  | "Pascal_Snake_Case";
