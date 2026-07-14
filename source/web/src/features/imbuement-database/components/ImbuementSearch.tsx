"use client";

import type { ImbuementSearchResult } from "../types";

type ImbuementSearchProps = {
  query: string;
  results: ImbuementSearchResult[];
  loading: boolean;
  selectedId?: string;
  onQueryChange: (query: string) => void;
  onSelectImbuement: (id: string) => void;
};

export function ImbuementSearch({ query, results, loading, selectedId, onQueryChange, onSelectImbuement }: ImbuementSearchProps) {
  return (
    <div>
      <div className="field-group">
        <label>Pesquisar imbuement</label>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ex: vampirism, void, strike, sword"
        />
      </div>

      <div className="history-list imbuement-search-list" style={{ marginTop: 16 }}>
        {results.map((imbuement) => (
          <button
            className={`history-item imbuement-search-item${selectedId === imbuement.id ? " active" : ""}`}
            key={imbuement.id}
            type="button"
            onClick={() => onSelectImbuement(imbuement.id)}
          >
            <span>
              {imbuement.name}
              <span className="note" style={{ marginLeft: 10 }}>{imbuement.group}</span>
            </span>
            <span style={{ color: "var(--gold)" }}>{imbuement.totalNpcCost !== null ? `${imbuement.totalNpcCost} gp` : `${imbuement.materialCount} materiais`}</span>
          </button>
        ))}
      </div>

      {!loading && query.trim() && results.length === 0 ? (
        <div className="empty-msg">Nenhum imbuement encontrado. Tente outro termo ou altere o filtro de tier.</div>
      ) : null}
    </div>
  );
}
