"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import type { ItemDatabaseRecord } from "../types";
import type { ItemDroppedByMonster, ItemNpcTradeReference } from "../types";

const CITY_ALL = "__all__";
const CITY_UNKNOWN = "__unknown__";

export function ItemDetails({ item }: { item: ItemDatabaseRecord | null }) {
  const [cityFilter, setCityFilter] = useState(CITY_ALL);
  const [openSections, setOpenSections] = useState({
    buyers: true,
    sellers: true,
    monsters: true
  });

  const sortedBuyers = useMemo(() => sortNpcTrades(item?.boughtByNpcs ?? [], "buy"), [item?.boughtByNpcs]);
  const sortedSellers = useMemo(() => sortNpcTrades(item?.soldByNpcs ?? [], "sell"), [item?.soldByNpcs]);
  const cityOptions = useMemo(() => buildCityOptions(sortedBuyers, sortedSellers), [sortedBuyers, sortedSellers]);
  const filteredBuyers = useMemo(() => filterByCity(sortedBuyers, cityFilter), [sortedBuyers, cityFilter]);
  const filteredSellers = useMemo(() => filterByCity(sortedSellers, cityFilter), [sortedSellers, cityFilter]);

  useEffect(() => {
    if (!item) return;
    setCityFilter(CITY_ALL);
    setOpenSections({
      buyers: item.boughtByNpcCount <= 6,
      sellers: item.soldByNpcCount <= 6,
      monsters: item.droppedByCount <= 12
    });
  }, [item?.id, item?.boughtByNpcCount, item?.soldByNpcCount, item?.droppedByCount]);

  if (!item) {
    return (
      <EmptyState
        moduleKey="items"
        title="Escolha um item"
        description="Pesquise ou selecione um item para ver preco NPC, NPCs compradores/vendedores, monstros que dropam e asset local."
      />
    );
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

      {cityOptions.length ? (
        <div className="item-filter-row">
          <label>
            Cidade
            <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
              <option value={CITY_ALL}>Todas</option>
              {cityOptions.map((city) => (
                <option value={city.value} key={city.value}>{city.label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <CollapsibleSection
        title="NPCs que compram"
        count={item.boughtByNpcCount}
        summary="Maior preco primeiro"
        open={openSections.buyers}
        onToggle={() => setOpenSections((current) => ({ ...current, buyers: !current.buyers }))}
      >
        <NpcTradeList trades={filteredBuyers} emptyText="Nenhum NPC comprador encontrado para este filtro." />
      </CollapsibleSection>

      <CollapsibleSection
        title="NPCs que vendem"
        count={item.soldByNpcCount}
        summary="Menor preco primeiro"
        open={openSections.sellers}
        onToggle={() => setOpenSections((current) => ({ ...current, sellers: !current.sellers }))}
      >
        <NpcTradeList trades={filteredSellers} emptyText="Nenhum NPC vendedor encontrado para este filtro." />
      </CollapsibleSection>

      <CollapsibleSection
        title="Monstros que dropam"
        count={item.droppedByCount}
        summary="Loot da base local"
        open={openSections.monsters}
        onToggle={() => setOpenSections((current) => ({ ...current, monsters: !current.monsters }))}
      >
        <MonsterDropList monsters={item.droppedBy} />
      </CollapsibleSection>
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

function CollapsibleSection({
  title,
  count,
  summary,
  open,
  onToggle,
  children
}: {
  title: string;
  count: number;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="item-detail-section">
      <button className="item-section-toggle" type="button" onClick={onToggle} aria-expanded={open}>
        <span className="item-section-title">
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          <span>{title}</span>
        </span>
        <span className="item-section-meta">{count} - {summary}</span>
      </button>
      {open ? <div className="history-list">{children}</div> : null}
    </section>
  );
}

function NpcTradeList({ trades, emptyText }: { trades: ItemNpcTradeReference[]; emptyText: string }) {
  if (!trades.length) return <div className="empty-msg">{emptyText}</div>;

  return (
    <>
      {trades.map((npc) => (
        <div className="history-item" key={`${npc.tradeType}-${npc.normalizedName}-${npc.price ?? "price"}`}>
          <span className="item-row-title">
            <Link href={npc.npcHref} style={{ color: "inherit", textDecoration: "none" }}>
              {npc.npcName}
            </Link>
            <span className="item-row-subtitle">{npc.city ?? "Cidade pendente"}</span>
          </span>
          <span style={{ color: "var(--gold)" }}>{npc.price ? `${npc.price} gp` : "-"}</span>
        </div>
      ))}
    </>
  );
}

function MonsterDropList({ monsters }: { monsters: ItemDroppedByMonster[] }) {
  if (!monsters.length) return <div className="empty-msg">Nenhum monstro encontrado para este item.</div>;

  return (
    <>
      {monsters.map((monster) => (
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
    </>
  );
}

function sortNpcTrades(trades: ItemNpcTradeReference[], type: "buy" | "sell") {
  return [...trades].sort((a, b) => {
    const aPrice = a.price ?? (type === "buy" ? -1 : Number.MAX_SAFE_INTEGER);
    const bPrice = b.price ?? (type === "buy" ? -1 : Number.MAX_SAFE_INTEGER);
    if (aPrice !== bPrice) return type === "buy" ? bPrice - aPrice : aPrice - bPrice;
    return a.npcName.localeCompare(b.npcName);
  });
}

function filterByCity(trades: ItemNpcTradeReference[], cityFilter: string) {
  if (cityFilter === CITY_ALL) return trades;
  if (cityFilter === CITY_UNKNOWN) return trades.filter((trade) => !trade.city);
  return trades.filter((trade) => trade.city === cityFilter);
}

function buildCityOptions(...tradeGroups: ItemNpcTradeReference[][]) {
  const cities = new Set<string>();
  let hasUnknown = false;

  for (const trades of tradeGroups) {
    for (const trade of trades) {
      if (trade.city) cities.add(trade.city);
      else hasUnknown = true;
    }
  }

  const options = Array.from(cities)
    .sort((a, b) => a.localeCompare(b))
    .map((city) => ({ value: city, label: city }));

  if (hasUnknown) options.push({ value: CITY_UNKNOWN, label: "Cidade pendente" });
  return options;
}
