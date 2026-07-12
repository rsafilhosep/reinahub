"use client";

import Link from "next/link";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import type { NpcHubRecord } from "../types";

export function NpcDetails({ npc }: { npc: NpcHubRecord | null }) {
  if (!npc) {
    return <div className="empty-msg">Selecione um NPC para ver os detalhes.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <img
          src={npc.image.path}
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
          <div className="label">NPC</div>
          <div className="value gold">{npc.name}</div>
        </div>
      </div>

      <div className="hero-grid">
        <Metric label="Itens comprados" value={`${npc.itemsBoughtCount}`} />
        <Metric label="Itens vendidos" value={`${npc.itemsSoldCount}`} />
        <Metric label="Cidade" value={npc.location.city ?? "-"} />
        <Metric label="Asset" value={npc.image.exists ? "Encontrado" : "Pendente"} />
      </div>

      <TradeList title="Itens que o NPC compra" items={npc.itemsBought} />
      <TradeList title="Itens que o NPC vende" items={npc.itemsSold} />
      {npc.itemsBought.length > 50 ? <div className="note">Mostrando os primeiros 50 itens relacionados.</div> : null}
    </div>
  );
}

function TradeList({ title, items }: { title: string; items: NpcHubRecord["itemsBought"] }) {
  if (!items.length) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div className="label">{title}</div>
      <div className="history-list">
        {items.slice(0, 50).map((item) => (
          <div className="history-item" key={`${item.tradeType}-${item.itemId ?? item.itemName}-${item.price ?? "price"}`}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <img
                src={item.imagePath}
                alt=""
                width={24}
                height={24}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_ITEM_IMAGE;
                }}
                style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
              />
              {item.itemHref ? (
                <Link href={item.itemHref} style={{ color: "inherit", textDecoration: "none" }}>
                  {item.itemName}
                </Link>
              ) : (
                item.itemName
              )}
            </span>
            <span style={{ color: "var(--gold)" }}>{item.price ? `${item.price} gp` : "-"}</span>
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
