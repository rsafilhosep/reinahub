import type { SpriteMeta } from "@/types/vault";
import { StorageService } from "./storage-service";

export const SPRITE_CACHE_KEY = "vot_sprite_cache";
export const SPRITE_META_KEY = "vot_sprite_meta";
const API_BASE = "https://www.tibiawiki.com.br/api.php";

export type SpriteCache = Record<string, string>;
export type SpriteMetaMap = Record<string, SpriteMeta>;

export function loadSpriteCache() {
  return StorageService.get<SpriteCache>(SPRITE_CACHE_KEY, {});
}

export function loadSpriteMeta() {
  return StorageService.get<SpriteMetaMap>(SPRITE_META_KEY, {});
}

export function queueCreatures(names: string[]) {
  const meta = loadSpriteMeta();
  let added = 0;
  names.filter(Boolean).forEach((name) => {
    if (!meta[name]) {
      meta[name] = { status: "pending", date: null };
      added += 1;
    }
  });
  StorageService.set(SPRITE_META_KEY, meta);
  return added;
}

export function clearSprites() {
  StorageService.remove(SPRITE_CACHE_KEY);
  StorageService.remove(SPRITE_META_KEY);
}

export function resetSpriteErrors() {
  const meta = loadSpriteMeta();
  Object.keys(meta).forEach((name) => {
    if (meta[name].status === "error") meta[name] = { status: "pending", date: null };
  });
  StorageService.set(SPRITE_META_KEY, meta);
}

export async function fetchSprite(name: string) {
  const meta = loadSpriteMeta();
  const cache = loadSpriteCache();
  const filename = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("_");

  try {
    const apiUrl = `${API_BASE}?action=query&titles=Arquivo:${encodeURIComponent(filename)}.gif&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    const data = await res.json();
    const page = Object.values(data.query?.pages ?? {})[0] as { imageinfo?: { url: string }[]; missing?: unknown };
    const imageUrl = page?.imageinfo?.[0]?.url;
    if (!imageUrl || page.missing !== undefined) throw new Error("Imagem nao encontrada na wiki");

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Imagem HTTP ${imageRes.status}`);
    const blob = await imageRes.blob();
    const dataUrl = await blobToDataUrl(blob);
    cache[name] = dataUrl;
    meta[name] = { status: "ok", date: new Date().toISOString(), size: blob.size };
  } catch (error) {
    meta[name] = {
      status: "error",
      date: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Erro desconhecido"
    };
  }

  StorageService.set(SPRITE_CACHE_KEY, cache);
  StorageService.set(SPRITE_META_KEY, meta);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Erro ao converter imagem"));
    reader.readAsDataURL(blob);
  });
}
