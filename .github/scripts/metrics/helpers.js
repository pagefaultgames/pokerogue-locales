import {
  lstatSync,
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { LOCALES_DIR } from "../helpers/constants.js";
import { getFiles as getFilesBase, getLanguageCodes, removeLanguageCode } from "../helpers/get-files.js";
import path from "path";

export function findMissing(object, lngSource) {
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

export function checkContent(tuple) {
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

export function getFiles() {
    const namespace = {};
    const languagesCodes = getLanguageCodes();
    
    for (const languageCode of languagesCodes) {
        const languagePath = path.join(LOCALES_DIR, languageCode);
        const files = getFilesBase(languagePath);

        for (const file of files) {
            getKeys(file, languagePath, namespace);
        }
    }

    return namespace;
}

function getKeys(filePath, baseDir, namespace) {
    const fileContent = readFileSync(filePath, "utf-8");

    const content = JSON.parse(fileContent);

    namespace[baseDir] = {
        ...namespace[baseDir],
        [removeLanguageCode(filePath)]: content,
    };
}

export function getBadgeColor(percent) {
  if (percent < 25) return 'crimson';
  if (percent < 50) return 'orange';
  if (percent < 75) return 'yellow';
  if (percent < 100) return 'yellowgreen';
  return 'brightgreen'; // 100% Perfect
}

export function encodeShieldsString(text) {
  return encodeURIComponent(
    text
    .replaceAll('-', '--') 
    .replaceAll('_', '__')
    .replaceAll(' ', '_')
  );
}

export function removeKeysOnObject(object, ...keys) {
    return Object.entries(object)
        .map(([key, value]) => {
            if (keys.includes(key)) {
            return {
                [key]: value,
            }
            }
        }).reduce((p, c, {}) => ({...p, ...c}))
}
