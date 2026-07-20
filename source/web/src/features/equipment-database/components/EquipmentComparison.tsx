"use client";

import { MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import type { EquipmentComparison as EquipmentComparisonType } from "../types";

type EquipmentComparisonProps = {
  leftId: string;
  rightId: string;
  comparison: EquipmentComparisonType | null;
  onCompare: () => void;
};

export function EquipmentComparison({ leftId, rightId, comparison, onCompare }: EquipmentComparisonProps) {
  return (
    <div>
      <div className="equipment-compare-action">
        <div className="note">
          A = <strong>{leftId || "escolha na lista"}</strong> / B = <strong>{rightId || "escolha na lista"}</strong>
        </div>
        <button className="quick-btn primary" type="button" onClick={onCompare} disabled={!leftId || !rightId || leftId === rightId}>
          Comparar A vs B
        </button>
      </div>

      {!comparison ? (
        <div className="empty-msg">Use os botoes A e B na lista de equipamentos para montar uma comparacao.</div>
      ) : (
        <>
          <div className="equipment-compare-head">
            <EquipmentMiniCard side="A" name={comparison.left.name} image={comparison.left.image.path} />
            <EquipmentMiniCard side="B" name={comparison.right.name} image={comparison.right.image.path} />
          </div>

          <div className="equipment-compare-table">
            <div className="equipment-compare-row header">
              <span>Atributo</span>
              <span>{comparison.left.name}</span>
              <span>{comparison.right.name}</span>
              <span>Melhor</span>
            </div>
            {comparison.metrics.map((metric) => (
              <div className="equipment-compare-row" key={metric.key}>
                <span>{metric.label}</span>
                <span className={metric.winner === "left" ? "winner" : ""}>{metric.leftValue}</span>
                <span className={metric.winner === "right" ? "winner" : ""}>{metric.rightValue}</span>
                <span>{formatWinner(metric.winner)}</span>
              </div>
            ))}
          </div>

          <div className="equipment-summary-list">
            {comparison.summary.map((line) => (
              <div className="pill" key={line}>{line}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EquipmentMiniCard({ side, name, image }: { side: string; name: string; image: string }) {
  return (
    <div className="equipment-mini-card">
      <span className="onboarding-step-index">{side}</span>
      <img
        src={image}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = MISSING_ITEM_IMAGE;
        }}
        style={{ width: 36, height: 36, imageRendering: "pixelated", objectFit: "contain" }}
      />
      <strong>{name}</strong>
    </div>
  );
}

function formatWinner(winner: "left" | "right" | "tie" | "none") {
  if (winner === "left") return "A";
  if (winner === "right") return "B";
  if (winner === "tie") return "Empate";
  return "-";
}
