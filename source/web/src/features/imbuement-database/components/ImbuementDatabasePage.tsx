"use client";

import { Panel } from "@/components/Panel";
import { useImbuementDatabase } from "../hooks";
import { ImbuementDetails } from "./ImbuementDetails";
import { ImbuementSearch } from "./ImbuementSearch";

const TIER_FILTERS = [
  { key: "", label: "Todos" },
  { key: "basic", label: "Basic" },
  { key: "intricate", label: "Intricate" },
  { key: "powerful", label: "Powerful" }
];

export function ImbuementDatabasePage({ initialImbuementId }: { initialImbuementId?: string }) {
  const { query, setQuery, tier, setTier, results, selectedImbuement, selectImbuement, loading, error } = useImbuementDatabase(initialImbuementId);

  return (
    <>
      <Panel title="Busca de imbuements" eyebrow={loading ? "carregando" : "base inicial"}>
        <div className="quick-row" style={{ marginTop: 0, marginBottom: 14 }}>
          {TIER_FILTERS.map((filter) => (
            <button
              className={`quick-btn ${tier === filter.key ? "primary" : ""}`}
              key={filter.key || "all"}
              type="button"
              onClick={() => setTier(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <ImbuementSearch
          query={query}
          results={results}
          loading={loading}
          onQueryChange={setQuery}
          onSelectImbuement={selectImbuement}
        />
        {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}
      </Panel>

      <Panel title="Detalhes do imbuement" eyebrow="materiais - npc price - assets">
        <ImbuementDetails imbuement={selectedImbuement} />
      </Panel>
    </>
  );
}
