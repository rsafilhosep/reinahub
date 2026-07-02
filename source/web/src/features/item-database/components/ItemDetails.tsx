"use client";

import Link from "next/link";
import type { ItemDatabaseRecord } from "../types";

const MISSING_ITEM_IMAGE = "/assets/icons/missing-item.svg";
const MISSING_CREATURE_IMAGE = "/assets/icons/missing-creature.svg";

export function ItemDetails({ item }: { item: ItemDatabaseRecord | null }) {
  if (!item) {
    return <div className="empty-msg">Selecione um item para ver os detalhes.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <img
          src={item.image.path}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = MISSING_ITEM_IMAGE;
          }}
          style={{ width: 72, height: 72, imageRendering: "pixelated", objectFit: "contain" }}
        />
        <div>
          <div className="label">Item</div>
          <div className="value gold">{item.name}</div>
        </div>
      </div>

      <div className="hero-grid">
        <Metric label="Item ID" value={`${item.id}`} />
        <Metric label="Categoria" value={formatClassification(item.category)} />
        <Metric label="Slot" value={item.slot ? formatClassification(item.slot) : "-"} />
        <Metric label="Tipo de arma" value={item.weaponType ? formatClassification(item.weaponType) : "-"} />
        <Metric label="Preco NPC" value={item.npcPrice ? `${item.npcPrice} gp` : "-"} />
        <Metric label="Comprado por NPC" value={`${item.boughtByNpcCount}`} />
        <Metric label="Vendido por NPC" value={`${item.soldByNpcCount}`} />
        <Metric label="Monstros que dropam" value={`${item.droppedByCount}`} />
        <Metric label="Asset" value={item.image.exists ? "Encontrado" : "Pendente"} />
        <Metric label="Classificacao" value={formatClassification(item.classificationConfidence)} />
      </div>

      <div className="history-list" style={{ marginTop: 18 }}>
        {item.boughtByNpcs.map((npc) => (
          <div className="history-item" key={`${npc.tradeType}-${npc.normalizedName}-${npc.price ?? "price"}`}>
            <span>
              Comprado por{" "}
              <Link href={npc.npcHref} style={{ color: "inherit", textDecoration: "none" }}>
                {npc.npcName}
              </Link>
            </span>
            <span style={{ color: "var(--gold)" }}>{npc.price ? `${npc.price} gp` : "-"}</span>
          </div>
        ))}
        {item.soldByNpcs.map((npc) => (
          <div className="history-item" key={`${npc.tradeType}-${npc.normalizedName}-${npc.price ?? "price"}`}>
            <span>
              Vendido por{" "}
              <Link href={npc.npcHref} style={{ color: "inherit", textDecoration: "none" }}>
                {npc.npcName}
              </Link>
            </span>
            <span style={{ color: "var(--gold)" }}>{npc.price ? `${npc.price} gp` : "-"}</span>
          </div>
        ))}
      </div>

      <div className="history-list" style={{ marginTop: 18 }}>
        {item.droppedBy.map((monster) => (
          <div className="history-item" key={monster.monsterName}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <img
                src={monster.imagePath}
                alt=""
                width={24}
                height={24}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_CREATURE_IMAGE;
                }}
                style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
              />
              <Link href={`/monsters?monster=${encodeURIComponent(monster.normalizedName)}`} style={{ color: "inherit", textDecoration: "none" }}>
                {monster.monsterName}
              </Link>
            </span>
            <span style={{ color: "var(--gold)" }}>
              {monster.maxCount ? `${monster.maxCount}x` : "-"}
              {monster.chance ? ` - ${monster.chance}` : ""}
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

function formatClassification(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
