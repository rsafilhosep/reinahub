import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "source", "web", "src", "reina-core", "worlds", "generated");
const outFile = path.join(outDir, "world-catalog.json");

const sources = [
  {
    id: "tibiadata-worlds",
    label: "TibiaData Worlds API",
    url: "https://api.tibiadata.com/v4/worlds",
    sourceUrl: "https://www.tibia.com/community/?subtopic=worlds",
    note: "TibiaData provides structured data based on the official Tibia worlds page."
  },
  {
    id: "deusot-serverinfo",
    label: "DeusOT Server Info",
    url: "https://deusot.com/p/serverinfo"
  },
  {
    id: "rubinot-wiki",
    label: "RubinOT Wiki",
    url: "https://wiki.rubinot.com/pt-BR"
  }
];

const rubinotFallback = [
  ["Auroria", "Open PvP"],
  ["Belaria", "Open PvP"],
  ["Bellum", "Optional PvP"],
  ["Cellenium", "Optional PvP"],
  ["Divinian", "Retro PvP"],
  ["Elysian", "Retro PvP"],
  ["Etherian", "Retro PvP"],
  ["Grimoria I", "Open PvP"],
  ["Grimoria II", "Open PvP"],
  ["Grimoria III", "Open PvP"],
  ["Grimoria IV", "Open PvP"],
  ["Halorian", "Retro PvP"],
  ["Lunarian", "Retro PvP"],
  ["Mystian", "Retro PvP"],
  ["Serenian", "Retro PvP"],
  ["Solarian", "Retro PvP"],
  ["Spectrum", "Optional PvP"],
  ["Tenebrium", "Optional PvP"],
  ["Vesperia", "Open PvP"]
];

const deusotFallback = [
  ["Sirius", "No-PVP"],
  ["Titan", "No-PVP"],
  ["Andromeda", "Retro-PVP"],
  ["Eclipse", "Retro-PVP"]
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const worlds = [
    ...(await fetchTibiaGlobal()),
    ...(await fetchDeusOT()),
    ...(await fetchRubinOT())
  ].sort((a, b) => `${a.platform}:${a.world}`.localeCompare(`${b.platform}:${b.world}`));

  const payload = {
    generatedAt: new Date().toISOString(),
    note: "Generated catalog for form suggestions only. Runtime pages do not fetch external sites.",
    sources,
    totals: {
      worlds: worlds.length,
      byPlatform: countBy(worlds, "platform")
    },
    worlds
  };

  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`World catalog generated: ${path.relative(root, outFile)}`);
  console.log(payload.totals);
}

async function fetchTibiaGlobal() {
  try {
    const data = await fetchJson("https://api.tibiadata.com/v4/worlds");
    const regularWorlds = data?.worlds?.regular_worlds ?? [];
    return regularWorlds.map((world) => ({
      platform: "Tibia Global",
      world: world.name,
      type: "global",
      premiumCurrency: "Tibia Coin",
      defaultLot: 25,
      pvpType: world.pvp_type ?? "",
      location: world.location ?? "",
      sourceId: "tibiadata-worlds",
      confidence: "api"
    }));
  } catch (error) {
    console.warn(`Could not fetch TibiaData worlds: ${error.message}`);
    return [];
  }
}

async function fetchDeusOT() {
  try {
    const html = await fetchText("https://deusot.com/p/serverinfo");
    const worldMatches = [...html.matchAll(/World Name:\s*([A-Za-z0-9' -]+)\s*Status:/gi)].map((match) => titleCase(match[1]));
    const names = worldMatches.length ? worldMatches : deusotFallback.map(([name]) => name);
    return names.map((world) => ({
      platform: "DeusOT",
      world,
      type: "ot",
      premiumCurrency: "Deus Coin",
      defaultLot: 25,
      pvpType: getFallbackPvp(world, deusotFallback),
      location: "Sao Paulo, Brazil",
      sourceId: "deusot-serverinfo",
      confidence: worldMatches.length ? "page" : "fallback"
    }));
  } catch (error) {
    console.warn(`Could not fetch DeusOT worlds: ${error.message}`);
    return deusotFallback.map(([world, pvpType]) => ({
      platform: "DeusOT",
      world,
      type: "ot",
      premiumCurrency: "Deus Coin",
      defaultLot: 25,
      pvpType,
      location: "Sao Paulo, Brazil",
      sourceId: "deusot-serverinfo",
      confidence: "fallback"
    }));
  }
}

async function fetchRubinOT() {
  try {
    const html = await fetchText("https://wiki.rubinot.com/pt-BR");
    const text = stripHtml(html);
    const names = rubinotFallback.filter(([name]) => text.includes(name));
    const rows = names.length ? names : rubinotFallback;
    return rows.map(([world, pvpType]) => ({
      platform: "RubinOT",
      world,
      type: "ot",
      premiumCurrency: "Rubini Coin",
      defaultLot: 25,
      pvpType,
      location: "",
      sourceId: "rubinot-wiki",
      confidence: names.length ? "page" : "fallback"
    }));
  } catch (error) {
    console.warn(`Could not fetch RubinOT worlds: ${error.message}`);
    return rubinotFallback.map(([world, pvpType]) => ({
      platform: "RubinOT",
      world,
      type: "ot",
      premiumCurrency: "Rubini Coin",
      defaultLot: 25,
      pvpType,
      location: "",
      sourceId: "rubinot-wiki",
      confidence: "fallback"
    }));
  }
}

async function fetchJson(url) {
  return JSON.parse(await requestText(url));
}

async function fetchText(url) {
  return requestText(url);
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          "user-agent": "ReinaHub/0.1"
        }
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request.destroy();
          requestText(new URL(response.headers.location, url).toString()).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`${response.statusCode} ${response.statusMessage}`));
          response.resume();
          return;
        }

        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => resolve(data));
      }
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error("Request timed out"));
    });
    request.on("error", reject);
  });
}

function stripHtml(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function titleCase(value) {
  return value.trim().replace(/\s+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFallbackPvp(world, fallback) {
  return fallback.find(([name]) => name.toLowerCase() === world.toLowerCase())?.[1] ?? "";
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] ?? 0) + 1;
    return acc;
  }, {});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
