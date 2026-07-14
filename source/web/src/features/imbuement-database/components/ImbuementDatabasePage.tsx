"use client";

import { Panel } from "@/components/Panel";
import { ToolGuide } from "@/components/ToolGuide";
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
      <ToolGuide
        title="Como usar imbuements"
        summary="Escolha um imbuement, revise materiais, preencha precos de Market e compare comprar versus farmar."
        steps={[
          {
            moduleKey: "imbuement",
            title: "1. Filtrar tier",
            description: "Use Basic, Intricate ou Powerful para reduzir a lista."
          },
          {
            moduleKey: "items",
            title: "2. Revisar materiais",
            description: "Cada material aponta para a base de itens quando houver correspondencia.",
            href: "/items"
          },
          {
            moduleKey: "market",
            title: "3. Preencher Market",
            description: "Informe preco unitario em GC para calcular custo total, moeda premium e reais."
          },
          {
            moduleKey: "monsters",
            title: "4. Ver fontes de drop",
            description: "Quando a base conhece os monstros, o material mostra onde pode ser farmado.",
            href: "/monsters"
          }
        ]}
      />

      <div className="imbuement-workspace">
        <aside className="imbuement-sidebar">
          <Panel title="Busca de imbuements" eyebrow={loading ? "carregando" : `${results.length} resultados`}>
            <div className="quick-row imbuement-tier-row">
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
              selectedId={selectedImbuement?.id}
              onQueryChange={setQuery}
              onSelectImbuement={selectImbuement}
            />
            {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}
          </Panel>
        </aside>

        <section className="imbuement-main">
          <Panel title="Detalhes do imbuement" eyebrow="materiais - npc price - assets">
            <ImbuementDetails imbuement={selectedImbuement} />
          </Panel>
        </section>
      </div>
    </>
  );
}
