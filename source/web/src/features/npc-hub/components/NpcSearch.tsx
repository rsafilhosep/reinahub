"use client";

import type { NpcSearchResult } from "../types";

type NpcSearchProps = {
  query: string;
  results: NpcSearchResult[];
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSelectNpc: (name: string) => void;
};

const MISSING_CREATURE_IMAGE = "/assets/icons/missing-creature.svg";

export function NpcSearch({ query, results, loading, onQueryChange, onSelectNpc }: NpcSearchProps) {
  return (
    <div>
      <div className="field-group">
        <label>Pesquisar NPC</label>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ex: NPC Price Reference"
        />
      </div>

      <div className="history-list" style={{ marginTop: 16 }}>
        {results.map((npc) => (
          <button
            className="history-item"
            key={npc.normalizedName}
            type="button"
            onClick={() => onSelectNpc(npc.name)}
            style={{ width: "100%", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <img
                src={npc.image.path}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_CREATURE_IMAGE;
                }}
                style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain" }}
              />
              {npc.name}
            </span>
            <span style={{ color: "var(--gold)" }}>{npc.itemsBoughtCount} compra(s)</span>
          </button>
        ))}
      </div>

      {!loading && query.trim() && results.length === 0 ? <div className="empty-msg">Nenhum NPC encontrado.</div> : null}
    </div>
  );
}
