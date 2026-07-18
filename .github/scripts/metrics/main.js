import {
  lstatSync,
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import path from "path";
import { fileURLToPath } from 'url';
import { COLORS, LOCALES_DIR, mainLanguage } from "../helpers/constants.js";
import { checkContent, findMissing, getFiles, getBadgeColor, encodeShieldsString, removeKeysOnObject } from "./helpers.js";

//#region Setup & Config
const rawMetrics = {
  date: new Date().toISOString(),
  average: 0,
  languages: {}
};

const langConfig = JSON.parse(readFileSync("registry.json", "utf-8"));
const languagesFiles = getFiles();
const languagesCodes = Object.keys(languagesFiles);
const lngSource = languagesFiles[mainLanguage];

const dataMetricsDir = path.join(LOCALES_DIR, 'data-metrics');
const templatePath = path.join(LOCALES_DIR, 'README_TEMPLATE.md');
const finalReadmePath = path.join(LOCALES_DIR, 'README.md');
const jsonOutputPath = path.join(dataMetricsDir, 'metrics.json');
//#endregion

//#region Collect & Calculate
rawMetrics.languages[mainLanguage] = {
  average: Object.entries(lngSource)
    .map(checkContent)
    .reduce((acc, current) => acc + current, 0),
  average_percent: 100,
};


for (const languageCode of languagesCodes) {
  if (languageCode === mainLanguage) continue;

  console.info(`Collect ${COLORS.info}\`${languageCode}\`${COLORS.reset} metrics`);

  const lng = languagesFiles[languageCode];

  const keyAverage = Object.entries(lng)
    .map(checkContent)
    .reduce((acc, current) => acc + current);

  rawMetrics.languages[languageCode] = {
    average: keyAverage,
    average_percent: parseFloat(((keyAverage * 100) / rawMetrics.languages[mainLanguage].average).toFixed(2)),
    missing: findMissing(lng, lngSource)
  };

  rawMetrics.average += rawMetrics.languages[languageCode].average_percent;
}

rawMetrics.average = parseFloat((rawMetrics.average / (languagesCodes.length - 1)).toFixed(2));
//#endregion

//#region Check Early Exit
const forceHydrate = process.env.FORCE_HYDRATE === "true";

const cleanMetricsJson = {
  ...rawMetrics,
  languages: Object.entries(rawMetrics.languages)
    .map(([_, v]) => {
      return removeKeysOnObject(v, "average", "average_percent");
    })
}

if (!forceHydrate && existsSync(jsonOutputPath)) {
  const existingMetrics = JSON.parse(readFileSync(jsonOutputPath, "utf-8"));
  
  const { date: oldDate, ...oldData } = existingMetrics;
  const { date: newData, ...newDataObj } = cleanMetricsJson;

  if (JSON.stringify(oldData) === JSON.stringify(newDataObj)) {
    console.log("No changes in keys or design templates. Skipping hydration.");
    process.exit(0);
  }
}

if (!existsSync(dataMetricsDir)) {
  mkdirSync(dataMetricsDir, { recursive: true });
}

writeFileSync(jsonOutputPath, JSON.stringify(cleanMetricsJson, null, 2), 'utf-8');
console.log("Metrics exported to:", COLORS.file, jsonOutputPath, COLORS.reset);
//#endregion

//#region README Hydration
let markdownContent = `Progress (${languagesCodes.length} languages): ![Progress global](https://img.shields.io/badge/localized-${encodeShieldsString(rawMetrics.average.toString() + "%")}-brightgreen)`
markdownContent += "\n";

languagesCodes
  .sort((langA, langB) => {
    const percentA = rawMetrics.languages[langA].average_percent;
    const percentB = rawMetrics.languages[langB].average_percent;
    
    return percentB - percentA;
  })
  .forEach((lang, i, langArray) => {
  const info = rawMetrics.languages[lang];
  const percent = info.average_percent;
  const percentString = `${percent}%`;
  
  const languageColor = getBadgeColor(percent);
  
  const badgeImg = `https://img.shields.io/badge/${encodeShieldsString(lang.toUpperCase())}-${encodeURIComponent(percentString)}-${languageColor}`;

  markdownContent += `- #### ${langConfig[lang] ? langConfig[lang].label.toUpperCase() : lang.toUpperCase()}`;
  markdownContent += ` ![Progress ${lang}](${badgeImg})\n\n`;

  if (!langConfig[lang]) {
    console.log(`${lang} doesn't have a label`);
  } else if (lang !== mainLanguage && langConfig[lang].note) {
    markdownContent += `${langConfig[lang].note}`;
  }

  if (info.average_percent < 40) {
    markdownContent += ` (Needs help)`;
  }
  markdownContent += `\n`;

  const { files, ...rest } = info.missing || {};
  const missingKeys = Object.keys(rest || {});
  const missingFiles = Object.values(files || {}) ?? [];
  if (missingKeys.length > 0 || missingFiles.length > 0) {
    markdownContent += `<details>\n<summary>🔍 View missing (${missingKeys.length} keys and ${missingFiles.length} files)</summary>\n\n`;
    
    // Avoid GitHub rendering issues.
    if (percent >= 80) {
      const formattedKeys = missingKeys
      .map((fileKey) =>
        `- ${fileKey}: ${rest[fileKey].map(key => `\`${key}\``).join(', ')}`
      )
      .join('\n');
      
      markdownContent += `${formattedKeys}\n`;
    } else {
      const limitedFormattedKeys = missingKeys
      .slice(0, 3)
      .map((fileKey) => {
        let subKeys = rest[fileKey].slice(0, 7).map(key => `\`${key}\``).join(', ');

        if (subKeys.length > 7) {
          subKeys += ` and ${(rest[fileKey] || []).length - 7} more...`;
        }

        return `- ${fileKey}: ${subKeys}`
      })
      .join('\n');

      markdownContent += `${limitedFormattedKeys}\n`;
    }

    const formattedFiles = missingFiles.map(file => `\`${file}\``);

    markdownContent += `\n`;
    markdownContent += `Missing files: ${formattedFiles}\n`;

    markdownContent += `</details>\n\n`;
  } else {
    markdownContent += `ℹ️ *Up to date.*\n`;
  }
  
  if (i < langArray.length - 1) {
    markdownContent += `<br/><br/>\n\n`;
    markdownContent += `---\n\n`;
  }
});

if (templatePath && existsSync(templatePath)) {
  let templateContent = readFileSync(templatePath, 'utf-8');
  
  const regex = /<!-- METRICS:START -->[\s\S]*<!-- METRICS:END -->/;
  const replacementBlock = `<!-- METRICS:START -->\n${markdownContent}<!-- METRICS:END -->`;
  
  if (regex.test(templateContent)) {
    const finalReadmeContent = templateContent.replace(regex, replacementBlock);
    
    writeFileSync(finalReadmePath, finalReadmeContent, 'utf-8');
    console.log(COLORS.corrected, "README.md successfully generated from template!", COLORS.reset);
  } else {
    console.error(COLORS.red, "Error: Could not find '<!-- METRICS:START -->' and '<!-- METRICS:END -->' comments in README_TEMPLATE.md", COLORS.reset);
  }
} else {
  console.error(COLORS.red, "Error: README_TEMPLATE.md not found in the root directory.", COLORS.reset);
}
//#endregion