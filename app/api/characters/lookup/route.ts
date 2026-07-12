import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import type { CharacterLookupResult, CharacterPlatform, CharacterProfile } from "@/source/web/src/features/character-profile/types/character-profile.types";

export const runtime = "nodejs";

const browserHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
};

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  const platform = (request.nextUrl.searchParams.get("platform")?.trim() || "Tibia Global") as CharacterPlatform;

  if (!name) {
    return NextResponse.json<CharacterLookupResult>({
      ok: false,
      source: platform,
      message: "Informe o nome do personagem."
    }, { status: 400 });
  }

  try {
    const urls = getLookupUrls(platform, name);
    if (!urls.length) {
      return NextResponse.json<CharacterLookupResult>({
        ok: false,
        source: platform,
        message: "Fonte ainda nao possui consulta automatica."
      });
    }

    const loaded = await fetchFirstAvailable(urls);

    if (loaded.blockedBy) {
      return NextResponse.json<CharacterLookupResult>({
        ok: false,
        source: platform,
        message: getBlockedMessage(platform, loaded.blockedBy, loaded.status),
        blockedBy: loaded.blockedBy,
        lookupUrl: getManualLookupUrl(platform, name)
      }, { status: 200 });
    }

    if (!loaded.ok) {
      return NextResponse.json<CharacterLookupResult>({
        ok: false,
        source: platform,
        message: `A fonte recusou a consulta (${loaded.status}). Use preenchimento manual por enquanto.`,
        lookupUrl: getManualLookupUrl(platform, name)
      }, { status: 200 });
    }

    const html = loaded.html;
    const character = platform === "RubinOT" ? parseRubinotCharacter(html) : parseTibiaCharacter(html);

    if (!character.name) {
      return NextResponse.json<CharacterLookupResult>({
        ok: false,
        source: platform,
        message: "Nao consegui localizar a tabela do personagem nessa pagina."
      });
    }

    return NextResponse.json<CharacterLookupResult>({
      ok: true,
      source: platform,
      message: "Personagem encontrado.",
      character: {
        ...character,
        platform
      }
    });
  } catch (error) {
    return NextResponse.json<CharacterLookupResult>({
      ok: false,
      source: platform,
      message: error instanceof Error ? error.message : "Falha ao consultar personagem."
    });
  }
}

async function fetchFirstAvailable(urls: string[]) {
  let lastStatus = 0;
  for (const url of urls) {
    const response = await fetchHtml(url);
    lastStatus = response.status;

    if (response.blockedBy) return response;
    if (response.ok) return response;
  }
  return { ok: false, status: lastStatus, html: "" };
}

async function fetchHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        ...browserHeaders,
        Referer: getReferer(url)
      },
      cache: "no-store",
      redirect: "follow"
    });
    const html = await response.text();
    const blockedBy = detectBlockedPage(response.status, html);
    return { ok: response.ok && !blockedBy, status: response.status, html, blockedBy };
  } catch (error) {
    if (isRubinotUrl(url) && isTlsError(error)) {
      return fetchHtmlWithRelaxedTls(url);
    }
    return { ok: false, status: 0, html: "", blockedBy: undefined };
  }
}

function fetchHtmlWithRelaxedTls(url: string) {
  return new Promise<{ ok: boolean; status: number; html: string; blockedBy?: CharacterLookupResult["blockedBy"] }>((resolve) => {
    const request = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          ...browserHeaders,
          Referer: getReferer(url),
          "Upgrade-Insecure-Requests": "1"
        }
      },
      (response) => {
        let html = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          html += chunk;
        });
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          const blockedBy = detectBlockedPage(status, html);
          resolve({ ok: status >= 200 && status < 300 && !blockedBy, status, html, blockedBy });
        });
      }
    );

    request.on("error", () => resolve({ ok: false, status: 0, html: "", blockedBy: "tls" }));
    request.setTimeout(15000, () => request.destroy(new Error("timeout")));
  });
}

function getLookupUrls(platform: CharacterPlatform, name: string) {
  const encoded = encodeURIComponent(name).replace(/%20/g, "+");
  const encodedPath = encodeURIComponent(name.trim());
  if (platform === "Tibia Global") return [`https://www.tibia.com/community/?name=${encoded}`];
  if (platform === "RubinOT") {
    return [
      `https://rubinot.com.br/characters/${encodedPath}`,
      `https://rubinot.com.br/characters/${encoded}`,
      `https://rubinot.com.br/character/${encodedPath}`,
      `https://rubinot.com.br/characters?name=${encoded}`
    ];
  }
  return [];
}

function getManualLookupUrl(platform: CharacterPlatform, name: string) {
  const encoded = encodeURIComponent(name.trim()).replace(/%20/g, "+");
  if (platform === "Tibia Global") return `https://www.tibia.com/community/?name=${encoded}`;
  if (platform === "RubinOT") return "https://rubinot.com.br/characters";
  return "";
}

function getBlockedMessage(platform: CharacterPlatform, blockedBy: CharacterLookupResult["blockedBy"], status: number) {
  if (platform === "RubinOT" && blockedBy === "cloudflare") {
    return `RubinOT protege a pagina de personagens com verificacao anti-bot (${status}). Abra a fonte no navegador e cole a ficha no ReinaHub por enquanto.`;
  }
  if (blockedBy === "tls") {
    return "A fonte nao completou a conexao segura. Use preenchimento manual por enquanto.";
  }
  return `A fonte bloqueou a consulta (${status}). Use preenchimento manual por enquanto.`;
}

function detectBlockedPage(status: number, html: string): CharacterLookupResult["blockedBy"] | undefined {
  const text = html.toLowerCase();
  if (
    status === 403 &&
    (text.includes("just a moment") || text.includes("cf_chl") || text.includes("cloudflare") || text.includes("__cf_chl"))
  ) {
    return "cloudflare";
  }
  return undefined;
}

function getReferer(url: string) {
  if (isRubinotUrl(url)) return "https://rubinot.com.br/characters";
  return "https://www.tibia.com/community/";
}

function isRubinotUrl(url: string) {
  return /https:\/\/(?:www\.)?rubinot\./i.test(url);
}

function isTlsError(error: unknown) {
  const cause = error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause : undefined;
  return cause?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || cause?.code === "SELF_SIGNED_CERT_IN_CHAIN";
}

function parseTibiaCharacter(html: string): Partial<CharacterProfile> {
  return normalizeParsedCharacter({
    name: getTableValue(html, "Name"),
    sex: getTableValue(html, "Sex"),
    vocation: getTableValue(html, "Vocation"),
    level: getTableValue(html, "Level"),
    achievementPoints: getTableValue(html, "Achievement Points"),
    world: getTableValue(html, "World"),
    residence: getTableValue(html, "Residence"),
    lastLogin: getTableValue(html, "Last Login"),
    accountStatus: getTableValue(html, "Account Status"),
    loyaltyTitle: getTableValue(html, "Loyalty Title")
  });
}

function parseRubinotCharacter(html: string): Partial<CharacterProfile> {
  return normalizeParsedCharacter({
    name: getTableValue(html, "Nome") || getTableValue(html, "Name"),
    sex: getTableValue(html, "Sexo") || getTableValue(html, "Sex"),
    vocation: getTableValue(html, "Vocacao") || getTableValue(html, "Vocação") || getTableValue(html, "Vocation"),
    level: getTableValue(html, "Nivel") || getTableValue(html, "Nível") || getTableValue(html, "Level"),
    achievementPoints: getTableValue(html, "Pontos de Conquista") || getTableValue(html, "Achievement Points"),
    world: getTableValue(html, "Mundo") || getTableValue(html, "World"),
    residence: getTableValue(html, "Residencia") || getTableValue(html, "Residência") || getTableValue(html, "Residence"),
    lastLogin: getTableValue(html, "Ultimo Login") || getTableValue(html, "Último Login") || getTableValue(html, "Last Login"),
    accountStatus: getTableValue(html, "Status da Conta") || getTableValue(html, "Account Status"),
    loyaltyTitle: getTableValue(html, "Titulo de Lealdade") || getTableValue(html, "Título de Lealdade") || getTableValue(html, "Loyalty Title")
  });
}

function getTableValue(html: string, label: string) {
  const labelPattern = escapeRegex(label).replace(/ /g, "\\s+");
  const patterns = [
    new RegExp(`<t[dh][^>]*>\\s*${labelPattern}:?\\s*</t[dh]>\\s*<t[dh][^>]*>([\\s\\S]*?)</t[dh]>`, "i"),
    new RegExp(`<[^>]+>\\s*${labelPattern}:?\\s*</[^>]+>\\s*<[^>]+>([\\s\\S]*?)</[^>]+>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanHtml(match[1]);
  }

  return "";
}

function normalizeParsedCharacter(raw: Record<string, string>): Partial<CharacterProfile> {
  return {
    name: raw.name || "",
    sex: raw.sex || "",
    vocation: normalizeVocation(raw.vocation),
    level: parseInteger(raw.level),
    targetLevel: Math.max(parseInteger(raw.level) + 30, 200),
    achievementPoints: parseInteger(raw.achievementPoints),
    world: raw.world || "",
    residence: raw.residence || "",
    lastLogin: raw.lastLogin || "",
    accountStatus: raw.accountStatus || "",
    loyaltyTitle: raw.loyaltyTitle || ""
  };
}

function normalizeVocation(value: string) {
  const normalized = cleanText(value).toLowerCase();
  const map: Record<string, CharacterProfile["vocation"]> = {
    "none": "None",
    "knight": "Knight",
    "elite knight": "Elite Knight",
    "paladin": "Paladin",
    "royal paladin": "Royal Paladin",
    "sorcerer": "Sorcerer",
    "master sorcerer": "Master Sorcerer",
    "druid": "Druid",
    "elder druid": "Elder Druid",
    "monk": "Monk",
    "exalted monk": "Exalted Monk"
  };
  return map[normalized] ?? "Custom";
}

function cleanHtml(value: string) {
  return cleanText(value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " "));
}

function cleanText(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInteger(value: string) {
  const number = Number(String(value).replace(/\D+/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
