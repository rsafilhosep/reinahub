"use client";

import { Panel } from "@/components/Panel";
import { useNpcHub } from "../hooks";
import { NpcDetails } from "./NpcDetails";
import { NpcSearch } from "./NpcSearch";

export function NpcHubPage({ initialNpcName }: { initialNpcName?: string }) {
  const { query, setQuery, results, selectedNpc, selectNpc, loading, error } = useNpcHub(initialNpcName);

  return (
    <>
      <Panel title="Busca de NPCs" eyebrow={loading ? "carregando" : "base local"}>
        <NpcSearch query={query} results={results} loading={loading} onQueryChange={setQuery} onSelectNpc={selectNpc} />
        {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}
      </Panel>

      <Panel title="Detalhes do NPC" eyebrow="trade - localizacao - relacoes">
        <NpcDetails npc={selectedNpc} />
      </Panel>
    </>
  );
}
