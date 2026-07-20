"use client";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import type { EquipmentRecord } from "../types";
import { formatEquipmentCategory, formatNumberValue, formatWeaponType, formatWeight } from "../utils";

export function EquipmentDetails({ equipment }: { equipment: EquipmentRecord | null }) {
  if (!equipment) {
    return (
      <EmptyState
        moduleKey="equipment"
        title="Escolha um equipamento"
        description="Pesquise uma arma, shield ou peca de set para ver atributos, peso, slots e comparacao."
      />
    );
  }

  return (
    <div>
      <div className="equipment-detail-head">
        <img
          src={equipment.image.path}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = MISSING_ITEM_IMAGE;
          }}
          style={{ width: 72, height: 72, imageRendering: "pixelated", objectFit: "contain" }}
        />
        <div>
          <div className="label">{formatEquipmentCategory(equipment.category)}</div>
          <div className="value gold">{equipment.name}</div>
          <p className="note">
            {equipment.weaponType ? `${formatWeaponType(equipment.weaponType)} - ` : ""}
            {equipment.sourceLabel}
          </p>
        </div>
      </div>

      <div className="hero-grid">
        <Metric label="Item ID" value={equipment.itemId ? `${equipment.itemId}` : "-"} />
        <Metric label="Level" value={formatNumberValue(equipment.level ?? 0)} />
        <Metric label="Ataque" value={formatNumberValue(equipment.attack)} />
        <Metric label="Defesa" value={formatNumberValue(equipment.defense)} />
        <Metric label="Armor" value={formatNumberValue(equipment.armor)} />
        <Metric label="Slots imbue" value={formatNumberValue(equipment.imbuementSlots)} />
        <Metric label="Maos" value={equipment.hands ? `${equipment.hands} mao${equipment.hands > 1 ? "s" : ""}` : "-"} />
        <Metric label="Peso" value={formatWeight(equipment.weightOz)} />
        <Metric label="Preco NPC" value={equipment.npcPrice ? `${formatNumberValue(equipment.npcPrice)} gp` : "-"} />
      </div>

      <div className="equipment-info-band">
        <span>
          <strong>Vocation:</strong> {equipment.vocations?.length ? equipment.vocations.join(", ") : "Livre / revisar"}
        </span>
        <span>
          <strong>Maos:</strong> {equipment.hands ? `${equipment.hands} mao${equipment.hands > 1 ? "s" : ""}` : "-"}
        </span>
        <span>
          <strong>Elemento:</strong> {equipment.element ?? "-"}
        </span>
        <span>
          <strong>Asset:</strong> {equipment.image.exists ? "Encontrado" : "Pendente"}
        </span>
      </div>

      {equipment.itemId ? (
        <Link className="quick-btn" href={`/items?itemId=${equipment.itemId}`} style={{ marginTop: 14 }}>
          Abrir no Item Database
        </Link>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hero-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
