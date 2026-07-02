"use client";

import { Panel } from "@/components/Panel";
import { useItemDatabase } from "../hooks";
import { ItemDetails } from "./ItemDetails";
import { ItemSearch } from "./ItemSearch";

const ITEM_CATEGORY_FILTERS = [
  { key: "", label: "Todos" },
  { key: "weapon", label: "Weapons" },
  { key: "potion", label: "Potions" },
  { key: "tool", label: "Tools" },
  { key: "helmet", label: "Helmets" },
  { key: "armor", label: "Armors" },
  { key: "legs", label: "Legs" },
  { key: "shield", label: "Shields" },
  { key: "creature-product", label: "Creature Products" },
  { key: "currency", label: "Currency" },
  { key: "rune", label: "Runes" }
];

export function ItemDatabasePage({ initialItemId }: { initialItemId?: string }) {
  const { query, setQuery, category, setCategory, results, selectedItem, selectItem, loading, error } = useItemDatabase(initialItemId);

  return (
    <>
      <Panel title="Busca de itens" eyebrow={loading ? "carregando" : "base local"}>
        <div className="quick-row" style={{ marginTop: 0, marginBottom: 14 }}>
          {ITEM_CATEGORY_FILTERS.map((filter) => (
            <button
              className={`quick-btn ${category === filter.key ? "primary" : ""}`}
              key={filter.key || "all"}
              type="button"
              onClick={() => setCategory(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <ItemSearch
          query={query}
          results={results}
          loading={loading}
          onQueryChange={setQuery}
          onSelectItem={selectItem}
        />
        {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}
      </Panel>

      <Panel title="Detalhes do item" eyebrow="preco - drops - assets">
        <ItemDetails item={selectedItem} />
      </Panel>
    </>
  );
}
