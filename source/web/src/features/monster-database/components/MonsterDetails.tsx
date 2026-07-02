"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { integer, moneySmart } from "@/services/format";
import { getActiveServer } from "@/services/quote-service";
import type { VaultServer } from "@/types/vault";
import type { MonsterDatabaseRecord } from "../types";

const MISSING_CREATURE_IMAGE = "/assets/icons/missing-creature.svg";
const MISSING_ITEM_IMAGE = "/assets/icons/missing-item.svg";

export function MonsterDetails({ monster }: { monster: MonsterDatabaseRecord | null }) {
  const [server, setServer] = useState<VaultServer | null>(null);

  useEffect(() => {
    const sync = () => setServer(getActiveServer());
    sync();
    window.addEventListener("reinahub:quote-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("reinahub:quote-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const pricedLootCount = useMemo(() => monster?.loot.filter((loot) => loot.sellPrice && loot.sellPrice > 0).length ?? 0, [monster]);

  if (!monster) {
    return <div className="empty-msg">Selecione um monstro para ver os detalhes.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <img
          src={monster.image.path}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = MISSING_CREATURE_IMAGE;
          }}
          style={{ width: 72, height: 72, imageRendering: "pixelated", objectFit: "contain" }}
        />
        <div>
          <div className="label">Monstro</div>
          <div className="value gold">{monster.name}</div>
        </div>
      </div>

      <div className="hero-grid">
        <Metric label="Experiencia" value={`${monster.experience} XP`} />
        <Metric label="Vida" value={`${monster.health} HP`} />
        <Metric label="Itens no loot" value={`${monster.lootItemCount}`} />
        <Metric label="Itens com preco NPC" value={`${pricedLootCount}`} />
        <Metric label="Assets encontrados" value={`${monster.foundAssetCount}`} />
      </div>

      <div className="history-list" style={{ marginTop: 18 }}>
        {monster.loot.map((loot) => (
          <div className="history-item" key={`${loot.itemId ?? loot.itemName}-${loot.chance ?? "chance"}`}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <img
                src={loot.imagePath}
                alt=""
                width={24}
                height={24}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_ITEM_IMAGE;
                }}
                style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
              />
              {loot.itemId ? (
                <Link href={`/items?itemId=${loot.itemId}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {loot.itemName}
                </Link>
              ) : (
                loot.itemName
              )}
            </span>
            <span style={{ color: "var(--gold)", textAlign: "right" }}>
              {loot.maxCount ? `${loot.maxCount}x` : "-"}
              {loot.sellPrice ? ` - ${integer(loot.sellPrice)} gp` : ""}
              {server && loot.sellPrice ? (
                <span className="note" style={{ display: "block", marginTop: 4 }}>
                  {formatLootEconomy(loot.sellPrice, server)}
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hero-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function formatLootEconomy(sellPrice: number, server: VaultServer) {
  if (sellPrice <= 0 || server.gcPorMoeda <= 0) return "";
  const forOnePremium = server.gcPorMoeda / sellPrice;
  const forBaseLot = (server.gcPorMoeda * server.lote) / sellPrice;
  return `${moneySmart(forOnePremium, 4)} para 1 ${server.moeda} - ${moneySmart(forBaseLot, 4)} para ${server.lote} ${server.moeda}`;
}
