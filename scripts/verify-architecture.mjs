import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "services", path.join("source", "web", "src")];
const allowedManualItemFetchFiles = new Set([
  normalizePath(path.join("source", "web", "src", "features", "item-database", "services", "item-search-client-service.ts"))
]);
const issues = [];

verifyManualItemApiFetch();
verifyServiceBarrels();
verifyClientFilesDoNotImportServerOnlyServices();

if (issues.length) {
  console.error("Architecture verification failed:");
  for (const issue of issues) {
    console.error(`- [${issue.rule}] ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}

console.log("Architecture verification complete");
console.log({
  checkedRoots: sourceRoots,
  issues: 0
});

function verifyManualItemApiFetch() {
  const files = listSourceFiles(sourceRoots);
  for (const file of files) {
    const rel = normalizePath(path.relative(root, file));
    if (allowedManualItemFetchFiles.has(rel)) continue;

    const content = readFileSync(file, "utf8");
    if (content.includes("fetch(`/api/items") || content.includes("fetch('/api/items") || content.includes('fetch("/api/items')) {
      issues.push({
        rule: "item-api-fetch",
        file: rel,
        message: "Use ItemSearchClientService instead of fetching /api/items directly."
      });
    }
  }
}

function verifyServiceBarrels() {
  const featureRoot = path.join(root, "source", "web", "src", "features");
  for (const indexFile of listSourceFiles([path.relative(root, featureRoot)]).filter((file) => normalizePath(file).endsWith("/services/index.ts"))) {
    const rel = normalizePath(path.relative(root, indexFile));
    const content = readFileSync(indexFile, "utf8");
    const exportedFiles = [...content.matchAll(/from\s+["'](.+)["']/g)]
      .map((match) => match[1])
      .filter((target) => target.startsWith("."))
      .map((target) => resolveTsModule(path.dirname(indexFile), target))
      .filter(Boolean);

    const kinds = new Set(exportedFiles.map((file) => classifyRuntime(file)));
    if (kinds.has("client") && kinds.has("server")) {
      issues.push({
        rule: "mixed-service-barrel",
        file: rel,
        message: "Do not export client and server-only services from the same services/index.ts barrel."
      });
    }
  }
}

function verifyClientFilesDoNotImportServerOnlyServices() {
  const files = listSourceFiles(sourceRoots);
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (!content.startsWith('"use client";') && !content.startsWith("'use client';")) continue;

    const imports = [...content.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    for (const importPath of imports) {
      if (!importPath.includes("/services")) continue;
      if (importPath.endsWith("/services") || importPath.endsWith("/services/index")) {
        const rel = normalizePath(path.relative(root, file));
        issues.push({
          rule: "client-service-barrel-import",
          file: rel,
          message: `Client file imports a services barrel (${importPath}). Import the specific client-safe service file instead.`
        });
      }
    }
  }
}

function listSourceFiles(relativeRoots) {
  const output = [];
  for (const relativeRoot of relativeRoots) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!exists(absoluteRoot)) continue;
    walk(absoluteRoot, output);
  }
  return output.filter((file) => /\.(ts|tsx)$/.test(file));
}

function walk(current, output) {
  const stats = statSync(current);
  if (stats.isFile()) {
    output.push(current);
    return;
  }

  for (const entry of readdirSync(current)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    walk(path.join(current, entry), output);
  }
}

function resolveTsModule(baseDir, importTarget) {
  const direct = path.resolve(baseDir, importTarget);
  const candidates = [`${direct}.ts`, `${direct}.tsx`, path.join(direct, "index.ts"), path.join(direct, "index.tsx")];
  return candidates.find(exists) ?? null;
}

function classifyRuntime(file) {
  const content = readFileSync(file, "utf8");
  if (content.includes('import "server-only"') || content.includes("import 'server-only'")) return "server";
  if (content.startsWith('"use client";') || content.startsWith("'use client';")) return "client";
  return "neutral";
}

function exists(filePath) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}
