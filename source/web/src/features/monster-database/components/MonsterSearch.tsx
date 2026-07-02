"use client";

import type { MonsterSearchResult } from "../types";

type MonsterSearchProps = {
  query: string;
  results: MonsterSearchResult[];
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSelectMonster: (name: string) => void;
};

const MISSING_CREATURE_IMAGE = "/assets/icons/missing-creature.svg";

export function MonsterSearch({
  query,
  results,
  loading,
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
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
              {monster.name}
            </span>
            <span style={{ color: "var(--gold)" }}>{monster.experience} XP</span>
          </button>
        ))}
      </div>

      {!loading && query.trim() && results.length === 0 ? <div className="empty-msg">Nenhum monstro encontrado.</div> : null}
    </div>
  );
}
