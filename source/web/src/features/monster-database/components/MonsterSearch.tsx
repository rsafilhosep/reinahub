"use client";

import { MISSING_CREATURE_IMAGE } from "@/source/web/src/reina-core/assets";
import type { MonsterSearchResult } from "../types";

type MonsterSearchProps = {
  query: string;
  results: MonsterSearchResult[];
  loading: boolean;
  hasActiveFilter: boolean;
  onQueryChange: (query: string) => void;
  onSelectMonster: (name: string) => void;
};

export function MonsterSearch({
  query,
  results,
  loading,
  hasActiveFilter,
  onQueryChange,
  onSelectMonster
}: MonsterSearchProps) {
  return (
    <div>
      <div className="field-group">
        <label>Pesquisar monstro</label>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ex: demon, dragon, rotworm"
        />
      </div>

      <div className="history-list" style={{ marginTop: 16 }}>
        {results.map((monster) => (
          <button
            className="history-item"
            key={monster.name}
            type="button"
            onClick={() => onSelectMonster(monster.name)}
            style={{ width: "100%", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <img
                src={monster.image.path}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_CREATURE_IMAGE;
                }}
                style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain" }}
              />
              <span>
                <span>{monster.name}</span>
                <span className="note" style={{ display: "block", marginTop: 3 }}>
                  {monster.classInfo.label}
                </span>
              </span>
            </span>
            <span style={{ color: "var(--gold)" }}>{monster.experience} XP</span>
          </button>
        ))}
      </div>

      {!loading && (query.trim() || hasActiveFilter) && results.length === 0 ? <div className="empty-msg">Nenhum monstro encontrado.</div> : null}
    </div>
  );
}
