import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const outputRoot = path.join(root, "source", "web", "src", "reina-core", "assets", "generated");

const trackedRoots = [
  "public/assets",
  "source/web/src/reina-core/assets/generated"
];

const entries = readGitStatus(trackedRoots);
const files = entries.map(toReportEntry);
const publicAssetFiles = files.filter((file) => file.path.startsWith("public/assets/"));
const generatedReportFiles = files.filter((file) => file.path.startsWith("source/web/src/reina-core/assets/generated/"));

const report = {
  generatedAt: new Date().toISOString(),
  policy: "ASSET_POLICY.md",
  summary: {
    changedFiles: files.length,
    publicAssetFiles: publicAssetFiles.length,
    generatedReportFiles: generatedReportFiles.length,
    totalChangedBytes: sum(files.map((file) => file.sizeBytes)),
    publicAssetChangedBytes: sum(publicAssetFiles.map((file) => file.sizeBytes)),
    generatedReportChangedBytes: sum(generatedReportFiles.map((file) => file.sizeBytes))
  },
  byArea: groupCount(files, (file) => file.area),
  byStatus: groupCount(files, (file) => file.statusLabel),
  byExtension: groupCount(files, (file) => file.extension || "(none)"),
  byPublicAssetFolder: groupCount(publicAssetFiles, (file) => file.publicAssetFolder || "(root)"),
  largestChangedFiles: [...files]
    .sort((left, right) => right.sizeBytes - left.sizeBytes)
    .slice(0, 25)
    .map(({ path, statusLabel, sizeBytes, area }) => ({ path, statusLabel, sizeBytes, area })),
  recommendations: buildRecommendations(publicAssetFiles, generatedReportFiles),
  files
};

mkdirSync(outputRoot, { recursive: true });
writeJson(path.join(outputRoot, "asset-git-report.json"), report);

console.log("Asset Git audit complete");
console.log(report.summary);
console.log(report.byPublicAssetFolder);

function readGitStatus(paths) {
  try {
    const output = execFileSync("git", ["status", "--porcelain=v1", "--", ...paths], {
      cwd: root,
      encoding: "utf8"
    });

    return output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({
        code: line.slice(0, 2),
        path: normalizeGitPath(line.slice(3))
      }));
  } catch (error) {
    throw new Error(`Unable to read git status for assets: ${error.message}`);
  }
}

function normalizeGitPath(value) {
  const pathValue = value.includes(" -> ") ? value.split(" -> ").at(-1) : value;
  return pathValue.replace(/^"|"$/g, "").replace(/\\/g, "/");
}

function toReportEntry(entry) {
  const absolutePath = path.join(root, entry.path);
  const extension = path.extname(entry.path).toLowerCase();
  const area = getArea(entry.path);

  return {
    path: entry.path,
    statusCode: entry.code,
    statusLabel: getStatusLabel(entry.code),
    area,
    publicAssetFolder: getPublicAssetFolder(entry.path),
    extension,
    sizeBytes: existsSync(absolutePath) ? statSync(absolutePath).size : 0
  };
}

function getArea(filePath) {
  if (filePath.startsWith("public/assets/")) return "runtime-public-asset";
  if (filePath.startsWith("source/web/src/reina-core/assets/generated/")) return "generated-report";
  return "other";
}

function getPublicAssetFolder(filePath) {
  if (!filePath.startsWith("public/assets/")) return null;
  return filePath.split("/")[2] ?? null;
}

function getStatusLabel(code) {
  if (code.includes("?")) return "untracked";
  if (code.includes("D")) return "deleted";
  if (code.includes("A")) return "added";
  if (code.includes("M")) return "modified";
  if (code.includes("R")) return "renamed";
  if (code.includes("C")) return "copied";
  return "changed";
}

function buildRecommendations(publicAssets, generatedReports) {
  const recommendations = [];
  const publicAssetBytes = sum(publicAssets.map((file) => file.sizeBytes));

  if (publicAssets.length > 500) {
    recommendations.push("Public assets changed in a large batch. Prefer committing by reviewed packs or using Git LFS/external storage if this keeps growing.");
  }

  if (publicAssetBytes > 25 * 1024 * 1024) {
    recommendations.push("Changed public assets exceed 25 MB. Review deployment and repository size before pushing.");
  }

  if (generatedReports.some((file) => file.sizeBytes > 1024 * 1024)) {
    recommendations.push("Some generated reports are large. Commit only reports needed by the app or useful for review; diagnostic reports can be regenerated.");
  }

  if (!recommendations.length) {
    recommendations.push("Asset changes are small enough for normal review.");
  }

  return recommendations;
}

function groupCount(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}
