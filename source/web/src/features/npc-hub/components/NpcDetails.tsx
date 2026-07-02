"use client";

import Link from "next/link";
import type { NpcHubRecord } from "../types";

const MISSING_CREATURE_IMAGE = "/assets/icons/missing-creature.svg";
const MISSING_ITEM_IMAGE = "/assets/icons/missing-item.svg";

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

      <div className="history-list" style={{ marginTop: 18 }}>
        {npc.itemsBought.slice(0, 50).map((item) => (
          <div className="history-item" key={`${item.itemId ?? item.itemName}-${item.price ?? "price"}`}>
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
      {npc.itemsBought.length > 50 ? <div className="note">Mostrando os primeiros 50 itens relacionados.</div> : null}
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
