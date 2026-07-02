"use client";

import { Panel } from "@/components/Panel";
import { useMonsterDatabase } from "../hooks";
import { MonsterDetails } from "./MonsterDetails";
import { MonsterSearch } from "./MonsterSearch";

export function MonsterDatabasePage({ initialMonsterName }: { initialMonsterName?: string }) {
  const { query, setQuery, results, selectedMonster, selectMonster, loading, error } = useMonsterDatabase(initialMonsterName);

  return (
    <>
      <Panel title="Detalhes do monstro" eyebrow="stats - loot - assets">
        <MonsterDetails monster={selectedMonster} />
      </Panel>

      <Panel title="Busca de monstros" eyebrow={loading ? "carregando" : "base local"}>
        <MonsterSearch
          query={query}
          results={results}
          loading={loading}
          onQueryChange={setQuery}
          onSelectMonster={selectMonster}
        />
        {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}
      </Panel>
    </>
  );
}
