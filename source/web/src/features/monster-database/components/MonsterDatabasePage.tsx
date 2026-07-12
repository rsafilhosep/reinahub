"use client";

import { Panel } from "@/components/Panel";
import { useMonsterDatabase } from "../hooks";
import type { MonsterClassSummary } from "../types";
import { MonsterDetails } from "./MonsterDetails";
import { MonsterSearch } from "./MonsterSearch";

export function MonsterDatabasePage({ initialMonsterName }: { initialMonsterName?: string }) {
  const {
    query,
    setQuery,
    creatureClass,
    setCreatureClass,
    classes,
    results,
    selectedMonster,
    selectMonster,
    loading,
    error
  } = useMonsterDatabase(initialMonsterName);

  return (
    <>
      <Panel title="Detalhes do monstro" eyebrow="stats - loot - assets">
        <MonsterDetails monster={selectedMonster} />
      </Panel>

      <Panel title="Busca de monstros" eyebrow={loading ? "carregando" : "base local"}>
        <MonsterClassFilter classes={classes} selectedClass={creatureClass} onSelectClass={setCreatureClass} />
        <MonsterSearch
          query={query}
          results={results}
          loading={loading}
          hasActiveFilter={Boolean(creatureClass)}
          onQueryChange={setQuery}
          onSelectMonster={selectMonster}
        />
        {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}
      </Panel>
    </>
  );
}

function MonsterClassFilter({
  classes,
  selectedClass,
  onSelectClass
}: {
  classes: MonsterClassSummary[];
  selectedClass: string;
  onSelectClass: (creatureClass: string) => void;
}) {
  if (!classes.length) return null;

  return (
    <div className="monster-class-filter" aria-label="Filtrar por classe de criatura">
      <div className="label">Classe</div>
      <div className="quick-row monster-class-row">
        {classes.map((creatureClass) => (
          <button
            className={`quick-btn ${selectedClass === creatureClass.id ? "primary" : ""}`}
            key={creatureClass.id || "all"}
            type="button"
            onClick={() => onSelectClass(creatureClass.id)}
            title={getClassTitle(creatureClass)}
          >
            {creatureClass.label} <span className="monster-class-count">{creatureClass.count}</span>
          </button>
        ))}
      </div>
      <div className="note">Classes usam a taxonomia local do ReinaHub; "Sem classe" guarda criaturas fora do bestiary ou ainda pendentes de revisao.</div>
    </div>
  );
}

function getClassTitle(creatureClass: MonsterClassSummary) {
  if (!creatureClass.expectedCount) return `${creatureClass.count} criatura(s) na base local`;
  return `${creatureClass.count} criatura(s) na base local. Referencia bestiary: ${creatureClass.expectedCount}`;
}
