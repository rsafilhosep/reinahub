"use client";

import { MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import type { EquipmentSearchResult } from "../types";
import { formatEquipmentCategory, formatNumberValue, formatWeaponType, formatWeight } from "../utils";

type EquipmentSearchProps = {
  query: string;
  category: string;
  weaponType: string;
  hands: string;
  level: string;
  includeAboveLevel: boolean;
  vocation: string;
  minSlots: string;
  maxWeightOz: string;
  results: EquipmentSearchResult[];
  loading: boolean;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onWeaponTypeChange: (value: string) => void;
  onHandsChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onIncludeAboveLevelChange: (value: boolean) => void;
  onVocationChange: (value: string) => void;
  onMinSlotsChange: (value: string) => void;
  onMaxWeightOzChange: (value: string) => void;
  onClearFilters: () => void;
  onSelectEquipment: (id: string) => void;
  onSetCompareLeft: (id: string) => void;
  onSetCompareRight: (id: string) => void;
};

const CATEGORY_FILTERS = [
  { key: "", label: "Todos" },
  { key: "weapon", label: "Weapons" },
  { key: "shield", label: "Shields" },
  { key: "armor", label: "Armors" },
  { key: "helmet", label: "Helmets" },
  { key: "legs", label: "Legs" },
  { key: "boots", label: "Boots" },
  { key: "container", label: "Containers" }
];

const WEAPON_FILTERS = [
  { key: "", label: "Todos" },
  { key: "sword", label: "Sword" },
  { key: "axe", label: "Axe" },
  { key: "club", label: "Club" },
  { key: "distance", label: "Distance" },
  { key: "wand", label: "Wand" },
  { key: "rod", label: "Rod" },
  { key: "ammo", label: "Ammo" }
];

const HAND_FILTERS = [
  { key: "", label: "Todas" },
  { key: "1", label: "1 mao" },
  { key: "2", label: "2 maos" }
];

const VOCATION_FILTERS = [
  { key: "", label: "Todas" },
  { key: "knight", label: "Knight" },
  { key: "paladin", label: "Paladin" },
  { key: "sorcerer", label: "Sorcerer" },
  { key: "druid", label: "Druid" },
  { key: "monk", label: "Monk" }
];

export function EquipmentSearch({
  query,
  category,
  weaponType,
  hands,
  level,
  includeAboveLevel,
  vocation,
  minSlots,
  maxWeightOz,
  results,
  loading,
  onQueryChange,
  onCategoryChange,
  onWeaponTypeChange,
  onHandsChange,
  onLevelChange,
  onIncludeAboveLevelChange,
  onVocationChange,
  onMinSlotsChange,
  onMaxWeightOzChange,
  onClearFilters,
  onSelectEquipment,
  onSetCompareLeft,
  onSetCompareRight
}: EquipmentSearchProps) {
  return (
    <div>
      <div className="equipment-primary-search">
        <label>
          Pesquisar equipamento
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Ex: bright sword, demon shield, crown armor"
          />
        </label>
        <button className="quick-btn" type="button" onClick={onClearFilters}>
          Limpar filtros
        </button>
      </div>

      <div className="equipment-filter-grid">
        <label>
          Categoria
          <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
            {CATEGORY_FILTERS.map((filter) => (
              <option key={filter.key || "all"} value={filter.key}>{filter.label}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={weaponType} onChange={(event) => onWeaponTypeChange(event.target.value)}>
            {WEAPON_FILTERS.map((filter) => (
              <option key={filter.key || "all-weapons"} value={filter.key}>{filter.label}</option>
            ))}
          </select>
        </label>
        <label>
          Vocação
          <select value={vocation} onChange={(event) => onVocationChange(event.target.value)}>
            {VOCATION_FILTERS.map((filter) => (
              <option key={filter.key || "all-vocations"} value={filter.key}>{filter.label}</option>
            ))}
          </select>
        </label>
        <label>
          Maos
          <select value={hands} onChange={(event) => onHandsChange(event.target.value)}>
            {HAND_FILTERS.map((filter) => (
              <option key={filter.key || "all-hands"} value={filter.key}>{filter.label}</option>
            ))}
          </select>
        </label>
        <label>
          Level do jogador
          <input
            inputMode="numeric"
            value={level}
            onChange={(event) => onLevelChange(event.target.value)}
            placeholder="Ex: 80"
          />
        </label>
        <label className="equipment-toggle-filter">
          <span>Acima do level</span>
          <button
            className={`quick-btn${includeAboveLevel ? "" : " primary"}`}
            type="button"
            onClick={() => onIncludeAboveLevelChange(!includeAboveLevel)}
          >
            {includeAboveLevel ? "Mostrar bloqueados" : "Ocultar bloqueados"}
          </button>
        </label>
        <label>
          Slots min.
          <input
            inputMode="numeric"
            value={minSlots}
            onChange={(event) => onMinSlotsChange(event.target.value)}
            placeholder="Ex: 2"
          />
        </label>
        <label>
          Peso max.
          <input
            inputMode="decimal"
            value={maxWeightOz}
            onChange={(event) => onMaxWeightOzChange(event.target.value)}
            placeholder="Ex: 60"
          />
        </label>
      </div>

      <div className="equipment-search-tools">
        <span className="note">
          {loading ? "Buscando..." : `${results.length} resultado(s). Use A e B para comparar.`}
        </span>
      </div>

      <div className="history-list equipment-list">
        {results.map((equipment) => (
          <div className={`history-item equipment-result${equipment.isUsableAtLevel ? "" : " is-locked"}`} key={equipment.id}>
            <button className="equipment-result-main" type="button" onClick={() => onSelectEquipment(equipment.id)}>
              <img
                src={equipment.image.path}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_ITEM_IMAGE;
                }}
                style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain" }}
              />
              <span>
                <strong>{equipment.name}</strong>
                <small>
                  {formatEquipmentCategory(equipment.category)}
                  {equipment.weaponType ? ` - ${formatWeaponType(equipment.weaponType)}` : ""}
                  {equipment.hands ? ` - ${equipment.hands} mao${equipment.hands > 1 ? "s" : ""}` : ""}
                  {equipment.requiredLevel ? ` - level ${equipment.requiredLevel}` : ""}
                  {equipment.vocations.length ? ` - ${equipment.vocations.join(", ")}` : ""}
                </small>
              </span>
            </button>
            <span className="equipment-result-stats">
              {!equipment.isUsableAtLevel ? <b className="equipment-lock-badge">level {equipment.requiredLevel}</b> : null}
              {equipment.attack ? `ATK ${formatNumberValue(equipment.attack)}` : equipment.armor ? `ARM ${formatNumberValue(equipment.armor)}` : ""}
              {equipment.defense ? ` DEF ${formatNumberValue(equipment.defense)}` : ""}
              {equipment.weightOz ? ` - ${formatWeight(equipment.weightOz)}` : ""}
            </span>
            <span className="equipment-result-actions">
              <button className="mini-action-btn" type="button" onClick={() => onSetCompareLeft(equipment.id)}>A</button>
              <button className="mini-action-btn" type="button" onClick={() => onSetCompareRight(equipment.id)}>B</button>
            </span>
          </div>
        ))}
      </div>

      {!loading && results.length === 0 ? (
        <div className="empty-msg">Nenhum equipamento encontrado para os filtros atuais.</div>
      ) : null}
    </div>
  );
}
