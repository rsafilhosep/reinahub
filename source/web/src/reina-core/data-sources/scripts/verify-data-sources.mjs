import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const dataSourcesDir = path.join(rootDir, "source", "web", "src", "reina-core", "data-sources");
const manifestPath = path.join(dataSourcesDir, "source-manifest.json");
const generatedDir = path.join(dataSourcesDir, "generated");

await fs.mkdir(generatedDir, { recursive: true });

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const generatedAt = new Date().toISOString();
const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
const runtimeDependencies = sources.filter((source) => source.runtimeDependency);
const missingSourceFolders = [];

for (const source of sources) {
  const sourceDir = path.join(dataSourcesDir, "sources", source.id);
  try {
    const stats = await fs.stat(sourceDir);
    if (!stats.isDirectory()) missingSourceFolders.push(source.id);
  } catch {
    missingSourceFolders.push(source.id);
  }
}

const report = {
  generatedAt,
  policy: manifest.policy,
  totalSources: sources.length,
  activeSources: sources.filter((source) => source.status === "active").length,
  plannedSources: sources.filter((source) => source.status === "planned").length,
  runtimeDependencyCount: runtimeDependencies.length,
  runtimeDependencies: runtimeDependencies.map((source) => source.id),
  missingSourceFolders,
  status: runtimeDependencies.length === 0 && missingSourceFolders.length === 0 ? "ok" : "review-required",
  note: "Data sources are references for controlled import. They must not be required by app pages at runtime."
};

await fs.writeFile(path.join(generatedDir, "data-sources-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("Data sources verification complete");
console.log(report);
