"use client";

import { useRef } from "react";
import { Panel } from "@/components/Panel";
import { useEquipmentDatabase } from "../hooks";
import { EquipmentComparison } from "./EquipmentComparison";
import { EquipmentDetails } from "./EquipmentDetails";
import { EquipmentSearch } from "./EquipmentSearch";

export function EquipmentDatabasePage({ initialEquipmentId }: { initialEquipmentId?: string }) {
  const detailsRef = useRef<HTMLDivElement>(null);
  const {
    activeContext,
    query,
    setQuery,
    category,
    setCategory,
    weaponType,
    setWeaponType,
    hands,
    setHands,
    level,
    setLevel,
    includeAboveLevel,
    setIncludeAboveLevel,
    vocation,
    setVocation,
    minSlots,
    setMinSlots,
    maxWeightOz,
    setMaxWeightOz,
    clearFilters,
    applyCharacterFilters,
    results,
    selectedEquipment,
    selectEquipment,
    compareLeftId,
    setCompareLeftId,
    compareRightId,
    setCompareRightId,
    comparison,
    compareSelected,
    loading,
    error
  } = useEquipmentDatabase(initialEquipmentId);

  async function handleSelectEquipment(id: string) {
    await selectEquipment(id);
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <div ref={detailsRef} className="scroll-anchor">
        <Panel title="Detalhes do equipamento" eyebrow="stats - peso - slots">
          <EquipmentDetails equipment={selectedEquipment} />
        </Panel>
      </div>

      <div className="equipment-workspace">
        <Panel title="Busca de equipamentos" eyebrow={loading ? "carregando" : `${results.length} resultados`}>
          <div className="equipment-context-band">
            <span>
              Personagem ativo:{" "}
              <strong>
                {activeContext?.character
                  ? `${activeContext.character.name} - ${activeContext.character.vocation} - level ${activeContext.character.level}`
                  : "nenhum personagem vinculado"}
              </strong>
            </span>
            <button className="quick-btn" type="button" onClick={applyCharacterFilters} disabled={!activeContext?.character}>
              Usar personagem ativo
            </button>
          </div>
          <EquipmentSearch
            query={query}
            category={category}
            weaponType={weaponType}
            hands={hands}
            level={level}
            includeAboveLevel={includeAboveLevel}
            vocation={vocation}
            minSlots={minSlots}
            maxWeightOz={maxWeightOz}
            results={results}
            loading={loading}
            onQueryChange={setQuery}
            onCategoryChange={setCategory}
            onWeaponTypeChange={setWeaponType}
            onHandsChange={setHands}
            onLevelChange={setLevel}
            onIncludeAboveLevelChange={setIncludeAboveLevel}
            onVocationChange={setVocation}
            onMinSlotsChange={setMinSlots}
            onMaxWeightOzChange={setMaxWeightOz}
            onClearFilters={clearFilters}
            onSelectEquipment={handleSelectEquipment}
            onSetCompareLeft={setCompareLeftId}
            onSetCompareRight={setCompareRightId}
          />
          {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}
        </Panel>

        <Panel title="Comparador" eyebrow="A vs B">
          <EquipmentComparison
            leftId={compareLeftId}
            rightId={compareRightId}
            comparison={comparison}
            onCompare={compareSelected}
          />
        </Panel>
      </div>
    </>
  );
}
