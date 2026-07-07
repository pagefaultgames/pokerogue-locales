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
import { getLanguageCodes } from "../locales-format-checker/get-files.js";


function findMissing(object) {
  const keys = {};
  const missingFiles = [];
  
  for (const key of Object.keys(lngSource)) {
    const missingKeysOnFiles = [];
    if (!object?.[key]) {

      missingFiles.push(key);
      
    } else {
      const recursive = function (oTarget, oSource, currentPath = []) {
        if (oSource && typeof oSource === "object" && !Array.isArray(oSource)) {
          for (const nextKey of Object.keys(oSource)) {
            recursive(
              oTarget?.[nextKey], 
              oSource[nextKey], 
              [...currentPath, nextKey]
            );
          }
          return;
        }

        if (oTarget === undefined || oTarget === null) {
          missingKeysOnFiles.push(currentPath.join("."));
        }
      };

      recursive(object[key], lngSource[key]);

      if (missingKeysOnFiles.length > 0) {
        keys[key] = missingKeysOnFiles;
      }
    }
    
  }

  if (missingFiles.length > 0) {
    keys["files"] = missingFiles;
  }

  return keys;
}

function checkContent(tuple) {
  const value = tuple[1];

  if (value === null || value === undefined) {
    return 0;
  }

  if (Array.isArray(value)) {
    return value
      .map((item, index) => checkContent([index, item]))
      .reduce((prev, curr) => prev + curr, 0);
  }

  if (typeof value === "object") {
    const internalEntries = Object.entries(value);
    if (internalEntries.length === 0) return 0;

    return internalEntries
      .map(checkContent)
      .reduce((prev, curr) => prev + curr, 0);
  }

  return 1;
}

/**
 * Crawl a directory recursively for json files to return their name with camelCase format.
 * Also if file is in directory returns format "dir/fileName" format
 * @param dir - The directory to crawl
 */
function getNameSpaces(dir, baseDir = dir, ns = {}) {
  const namespace = ns;
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = lstatSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath, baseDir, namespace);
    } else if (path.extname(file) === ".json") {
      processJsonFile(filePath, baseDir, namespace);
    }
  }

  return namespace;
}

function processDirectory(filePath, baseDir, namespace) {
  getNameSpaces(filePath, baseDir, namespace);
}

function processJsonFile(filePath, baseDir, namespace) {
  const nsAbsolutePath = path.resolve(process.cwd(), filePath);

  const fileContent = readFileSync(nsAbsolutePath, "utf-8")
    .replaceAll("\r", "")
    .replaceAll("\n", "")
    .replaceAll("\r\n", "");

  const content = JSON.parse(fileContent)

  const relativePath = path.relative(baseDir, filePath);

  const cleanKey = relativePath.split(path.sep).join(path.posix.sep);
  
  namespace[cleanKey] = content
}

const nsRelativePath = ".";

const languagesCodes = getLanguageCodes();

const rawMetrics = {
  date: new Date().toISOString(),
  average: 0,
  languages: {}
};

const lngSourceCode = "en";
const nsPath = path.join(nsRelativePath, lngSourceCode);
const lngSource = getNameSpaces(nsPath);


rawMetrics.languages[lngSourceCode] = {
  average: Object.entries(lngSource)
    .map(checkContent)
    .reduce((acc, current) => acc + current, 0),
  average_percent: 100,
};

for (const lngCode of languagesCodes) {
  if (lngCode === lngSourceCode) continue

  console.info(`Collect \`${lngCode}\` metrics`);

  const currentNsPath = path.join(nsRelativePath, lngCode);
  const lng = getNameSpaces(currentNsPath);

  const keyAverage = Object.entries(lng)
    .map(checkContent)
    .reduce((acc, current) => acc + current);

  rawMetrics.languages[lngCode] = {
    average: keyAverage,
    average_percent: parseFloat(((keyAverage * 100) / rawMetrics.languages[lngSourceCode].average).toFixed(2)),
    missing: findMissing(lng)
  };

  rawMetrics.average += rawMetrics.languages[lngCode].average_percent;
}

rawMetrics.average = parseFloat((rawMetrics.average / (languagesCodes.length - 1)).toFixed(2));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '../../../');
const dataMetricsDir = path.join(rootDir, 'data-metrics');
const templatePath = path.join(rootDir, 'README_TEMPLATE.md');
const finalReadmePath = path.join(rootDir, 'README.md');
const jsonOutputPath = path.join(dataMetricsDir, 'metrics.json');

const cleanMetricsJson = {
  date: rawMetrics.date,
  average: rawMetrics.average,
  languages: {}
};

Object.keys(rawMetrics.languages).forEach(lang => {
  cleanMetricsJson.languages[lang] = {
    average: rawMetrics.languages[lang].average,
    average_percent: rawMetrics.languages[lang].average_percent
  };
});


if (!existsSync(dataMetricsDir)) {
  mkdirSync(dataMetricsDir, { recursive: true });
}

writeFileSync(jsonOutputPath, JSON.stringify(cleanMetricsJson, null, 2), 'utf-8');
console.log(`Metrics exported to: ${jsonOutputPath}`);


function getBadgeColor(percent) {
  if (percent < 25) return 'crimson';
  if (percent < 50) return 'orange';
  if (percent < 75) return 'yellow';
  if (percent < 100) return 'yellowgreen';
  return 'brightgreen'; // 100% Perfect
}

function encodeShieldsString(text) {
  return text
    .replaceAll('-', '--') 
    .replaceAll('_', '__')
    .replaceAll(' ', '_');
}

let markdownContent = "\n";
markdownContent += `Progress (${languagesCodes.length} languages): ![Progress global](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FVassiat%2Fpokerogue-locales%2Frefs%2Fheads%2Ftmp%2Fci%2Ftranslation-exporter%2Fdata-metrics%2Fmetrics.json&query=%24.average&label=localized&suffix=%25&color=brightgreen)`
markdownContent += "\n";

Object.keys(rawMetrics.languages).forEach(lang => {
  const info = rawMetrics.languages[lang];
  const percent = info.average_percent;
  const percentString = `${percent}%`;
  
  const languageColor = getBadgeColor(percent);
  // const jsonUrlEncoded = encodeURIComponent("https://raw.githubusercontent.com/Vassiat/pokerogue-locales/refs/heads/tmp/ci/translation-exporter/data-metrics/metrics.json");
  // const queryPath = encodeURIComponent(`$.languages.${lang}.average_percent`);
  // Or dynamic target for external repository: `https://img.shields.io/badge/dynamic/json?url=${jsonUrlEncoded}&query=${queryPath}&label=${lang.toUpperCase()}&suffix=%25&color=${languageColor}`
  const badgeImg = `https://img.shields.io/badge/${encodeShieldsString(lang.toUpperCase())}-${encodeURIComponent(percentString)}-${languageColor}`;

  markdownContent += `- #### ${lang.toUpperCase()}`;
  markdownContent += ` ![Progress ${lang}](${badgeImg})\n\n`;

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
    markdownContent += `ℹ️ *Up to date.*\n\n`;
  }
  
  markdownContent += `<br/><br/>\n\n`;
  markdownContent += `---\n\n`;
});

if (existsSync(templatePath)) {
  let templateContent = readFileSync(templatePath, 'utf-8');
  
  const regex = /<!-- METRICS:START -->[\s\S]*<!-- METRICS:END -->/;
  const replacementBlock = `<!-- METRICS:START -->${markdownContent}<!-- METRICS:END -->`;
  
  if (regex.test(templateContent)) {
    const finalReadmeContent = templateContent.replace(regex, replacementBlock);
    
    writeFileSync(finalReadmePath, finalReadmeContent, 'utf-8');
    console.log("README.md successfully generated from template!");
  } else {
    console.error("Error: Could not find '<!-- METRICS:START -->' and '<!-- METRICS:END -->' comments in README_TEMPLATE.md");
  }
} else {
  console.error("Error: README_TEMPLATE.md not found in the root directory.");
}
