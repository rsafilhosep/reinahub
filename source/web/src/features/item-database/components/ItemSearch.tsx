"use client";

import type { ItemSearchResult } from "../types";

type ItemSearchProps = {
  query: string;
  results: ItemSearchResult[];
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSelectItem: (itemId: number) => void;
};

const MISSING_ITEM_IMAGE = "/assets/icons/missing-item.svg";

export function ItemSearch({ query, results, loading, onQueryChange, onSelectItem }: ItemSearchProps) {
  return (
    <div>
      <div className="field-group">
        <label>Pesquisar item</label>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ex: gold coin, platinum coin, demon shield"
        />
      </div>

      <div className="history-list" style={{ marginTop: 16 }}>
        {results.map((item) => (
          <button
            className="history-item"
            key={item.id}
            type="button"
            onClick={() => onSelectItem(item.id)}
            style={{ width: "100%", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <img
                src={item.image.path}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_ITEM_IMAGE;
                }}
                style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain" }}
              />
              {item.name}
            </span>
            <span style={{ color: "var(--gold)" }}>
              {item.weaponType ? `${item.weaponType} - ` : item.slot ? `${item.slot} - ` : ""}
              #{item.id}
            </span>
          </button>
        ))}
      </div>

      {!loading && query.trim() && results.length === 0 ? <div className="empty-msg">Nenhum item encontrado.</div> : null}
    </div>
  );
}
