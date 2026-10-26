import type { GrammarModule } from "#grammar/common";
import {
  type FormatterOptions,
  findProtectedSpans,
  getSourceLanguage,
  getStringVariables,
  isProtected,
  type ProcessorOptions,
  withCapitalizeOption,
} from "#grammar/common";
import type { PostProcessorModule } from "i18next";

const ITALIAN_ELISION_PATTERN =
  /(?<![\p{L}\p{N}'’])(?:(a|di|da|in|su)(\s+))?(il|lo|la|una|al|allo|alla|del|dello|della|dal|dallo|dalla|nel|nello|nella|sul|sullo|sulla)\s+((?:@\w\{[^}]*\})*)([\p{L}][\p{L}'’-]*)/giu;
const VOWEL_OR_MUTE_H = /^[aeiouàèéìòóùh]/iu;
const ITALIAN_NO_ELISION_STEMS = ["iato", "iod", "ion"] as const;

const ELIDED_PREFIXES: Readonly<Record<string, string>> = {
  a: "all’",
  di: "dell’",
  da: "dall’",
  in: "nell’",
  su: "sull’",
  il: "l’",
  lo: "l’",
  la: "l’",
  una: "un’",
  al: "all’",
  allo: "all’",
  alla: "all’",
  del: "dell’",
  dello: "dell’",
  della: "dell’",
  dal: "dall’",
  dallo: "dall’",
  dalla: "dall’",
  nel: "nell’",
  nello: "nell’",
  nella: "nell’",
  sul: "sull’",
  sullo: "sull’",
  sulla: "sull’",
};

function capitalizeLike(source: string, replacement: string): string {
  return source[0] === source[0].toLocaleUpperCase("it")
    ? replacement[0].toLocaleUpperCase("it") + replacement.slice(1)
    : replacement;
}

export function applyItalianElision(text: string, protectedValues: readonly string[] = []): string {
  const protectedSpans = findProtectedSpans(text, protectedValues);
  return text.replace(
    ITALIAN_ELISION_PATTERN,
    (
      match,
      preposition: string | undefined,
      prepositionSpace: string | undefined,
      article: string,
      markup: string,
      next: string,
      offset: number,
    ) => {
      const firstPart = next.toLocaleLowerCase("it").split(/[-’']/u)[0];
      if (
        !VOWEL_OR_MUTE_H.test(next)
        || ITALIAN_NO_ELISION_STEMS.some(stem => firstPart.startsWith(stem))
        || isProtected(protectedSpans, offset)
      ) {
        return match;
      }
      const source = `${preposition ?? ""}${prepositionSpace ?? ""}${article}`;
      const normalizedArticle = article.toLowerCase();
      let prefix: string;
      if (normalizedArticle === "una") {
        prefix = preposition ? `${preposition}${prepositionSpace}un’` : "un’";
      } else if (preposition) {
        prefix = ELIDED_PREFIXES[preposition.toLowerCase()];
      } else {
        prefix = ELIDED_PREFIXES[normalizedArticle];
      }
      return `${capitalizeLike(source, prefix)}${markup}${next}`;
    },
  );
}

export class ItalianElisionProcessor implements PostProcessorModule {
  public readonly name = "italian-elision";
  public readonly type = "postProcessor";

  process(
    value: string,
    _key: string | string[],
    options: ProcessorOptions | undefined,
    translator: { language?: string },
  ): string {
    return getSourceLanguage(options, translator).startsWith("it")
      ? applyItalianElision(value, getStringVariables(options))
      : value;
  }
}

export type ItalianNounCode = "m" | "f" | "mp" | "fp";
export type ItalianArticleForm = "definite" | "indefinite" | "di" | "a";

interface ItalianNounInfo {
  gender: "masculine" | "feminine";
  plural: boolean;
}

const NOUN_LISTS: Readonly<Record<ItalianNounCode, string>> = {
  m: `
    PP-su, PP-max, Piccolo buco nero
  `,
  f: `
    Superpozione, Iperpozione, Super esca, Granpepita, Grandelente, Multilente, Rocciamistica,
    Mega Ball, Ultra Ball, Rogue Ball, Master Ball, Chic Ball, Baccacedro, Baccaprugna,
    Baccaenigma, Baccalici, Baccalongan, Baccapitaya, Baccacocca, Baccasalak, Baccalangsa,
    Baccambola, Baccamela
  `,
  mp: "Avanzi, Tesori, PS",
  fp: "",
};

const HEAD_LISTS: Readonly<Record<"m" | "f", string>> = {
  m: `
    Polsino, Revitalizzante, Revitalseme, Etere, Elisir, PP, Fungo, Condividi, Ovamuleto,
    Esperienzamuleto, Fortunuovo, Uovo, Mirino, Supercolpo, Porro, Dobloantico, Monetamuleto,
    Pugno, Salvadanaio, Presartigli, Curamuleto, Barattolo, Porta, Rapidartigli, Barrierassalto,
    Cromamuleto, Abilitamuleto, Catturamuleto, Scanner, Cuneo, Gettone, Succo, Fangopece,
    Retino, Osso, Dente, Attacco, Att., AttSp, Att. Sp., PS
  `,
  f: `
    Caramella, Megapolsiera, Terasfera, Mappa, Pozione, Ricarica, Cura, Cenere, Erbachiara,
    Esca, Bilancia, Esperienza, Calmanella, Evolcondensa, Cuorugiada, Pepita, Capsula, Lente,
    Bandana, Roccia, Conchinella, Tossicsfera, Fiammosfera, Staffetta, Ball, Elettropalla,
    Polvere, Squama, Difesa, Dif., DifSp, Dif. Sp., Velocità, Vel, Precisione, Elusione,
    Bacca
  `,
};

function toItalianNounKey(name: string): string {
  return name.trim().toLocaleLowerCase("it").normalize("NFC").replace(/\s+/gu, " ");
}

let nounCodes: Map<string, ItalianNounCode> | undefined;
let headCodes: Map<string, "m" | "f"> | undefined;

function parseItalianNounList(list: string, code: ItalianNounCode, target: Map<string, ItalianNounCode>): void {
  for (const name of list.split(",")) {
    if (name.trim() !== "") {
      target.set(toItalianNounKey(name), code);
    }
  }
}

function buildItalianNounLookups(): Map<string, ItalianNounCode> {
  if (nounCodes === undefined || headCodes === undefined) {
    nounCodes = new Map();
    headCodes = new Map();
    for (const [code, list] of Object.entries(NOUN_LISTS) as [ItalianNounCode, string][]) {
      parseItalianNounList(list, code, nounCodes);
    }
    for (const [code, list] of Object.entries(HEAD_LISTS) as ["m" | "f", string][]) {
      for (const name of list.split(",")) {
        if (name.trim() !== "") {
          headCodes.set(toItalianNounKey(name), code);
        }
      }
    }
  }
  return nounCodes;
}

export function getItalianNounCode(name: string): ItalianNounCode | undefined {
  const key = toItalianNounKey(name);
  const exact = buildItalianNounLookups().get(key);
  if (exact !== undefined) {
    return exact;
  }
  for (const word of key.split(" ")) {
    const code = headCodes?.get(word);
    if (code !== undefined) {
      return code;
    }
  }
  return undefined;
}

const ITALIAN_SPECIAL_MASCULINE = /^(?:s[^aeiou]|z|gn|ps|x|y|i[aeiou])/iu;
const ITALIAN_VOWEL_START = /^[aeiouàèéìòóùh]/iu;

function hasSpecialMasculineArticle(noun: string): boolean {
  return ITALIAN_SPECIAL_MASCULINE.test(noun.trim());
}

function hasVowelStart(noun: string): boolean {
  const firstPart = noun.trim().toLocaleLowerCase("it").split(/[-’']/u)[0];
  return ITALIAN_VOWEL_START.test(firstPart) && !ITALIAN_NO_ELISION_STEMS.some(stem => firstPart.startsWith(stem));
}

function resolveItalianNounInfo(noun: string, options: FormatterOptions = {}): ItalianNounInfo {
  const code = getItalianNounCode(noun);
  const firstWord = noun.trim().split(/\s+/u)[0]?.toLocaleLowerCase("it") ?? "";
  let gender: ItalianNounInfo["gender"] = "masculine";
  if (options.gender === "feminine" || options.gender === "masculine") {
    gender = options.gender;
  } else if (code?.startsWith("f")) {
    gender = "feminine";
  } else if (!code && /a$/u.test(firstWord)) {
    gender = "feminine";
  }
  const plural =
    options.plural === undefined ? Boolean(code?.endsWith("p")) : options.plural === true || options.plural === "true";
  return { gender, plural };
}

export function withItalianArticle(noun: string, form: ItalianArticleForm, options: FormatterOptions = {}): string {
  const { gender, plural } = resolveItalianNounInfo(noun, options);
  const feminine = gender === "feminine";
  const vowel = hasVowelStart(noun);
  const specialMasculine = hasSpecialMasculineArticle(noun);
  let article: string;

  if (form === "definite") {
    if (plural) {
      article = feminine ? "le" : vowel || specialMasculine ? "gli" : "i";
    } else if (vowel) {
      article = "l’";
    } else if (feminine) {
      article = "la";
    } else {
      article = specialMasculine ? "lo" : "il";
    }
  } else if (form === "indefinite") {
    if (plural) {
      article = feminine ? "delle" : vowel || specialMasculine ? "degli" : "dei";
    } else if (feminine) {
      article = vowel ? "un’" : "una";
    } else {
      article = specialMasculine ? "uno" : "un";
    }
  } else if (form === "di") {
    if (plural) {
      article = feminine ? "delle" : vowel || specialMasculine ? "degli" : "dei";
    } else if (vowel) {
      article = "dell’";
    } else if (feminine) {
      article = "della";
    } else {
      article = specialMasculine ? "dello" : "del";
    }
  } else if (plural) {
    article = feminine ? "alle" : vowel || specialMasculine ? "agli" : "ai";
  } else if (vowel) {
    article = "all’";
  } else if (feminine) {
    article = "alla";
  } else {
    article = specialMasculine ? "allo" : "al";
  }

  return `${article}${article.endsWith("’") ? "" : " "}${noun}`;
}

export function createItalianArticleFormatter(form: ItalianArticleForm) {
  return withCapitalizeOption((value: unknown, options?: FormatterOptions) =>
    withItalianArticle(String(value), form, options),
  );
}

export const GRAMMAR: GrammarModule = {
  postProcessors: [new ItalianElisionProcessor()],
  formatters: {
    it_definite: createItalianArticleFormatter("definite"),
    it_indefinite: createItalianArticleFormatter("indefinite"),
    it_di: createItalianArticleFormatter("di"),
    it_a: createItalianArticleFormatter("a"),
  },
};
