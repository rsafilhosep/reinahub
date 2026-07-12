import "server-only";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const assetExistsCache = new Map<string, boolean>();

export const ServerAssetService = {
  publicAssetExists(assetPath: string) {
    const cached = assetExistsCache.get(assetPath);
    if (cached !== undefined) return cached;

    const normalizedPath = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
    const absolutePath = path.join(publicDir, normalizedPath);
    const exists = fs.existsSync(absolutePath);
    assetExistsCache.set(assetPath, exists);
    return exists;
  },

  clearCache() {
    assetExistsCache.clear();
  }
};
