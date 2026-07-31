import type React from "react";
import { integer, money } from "@/services/format";
import type { HuntSummary } from "@/services/hunt-service";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE, getMonsterImagePath } from "@/source/web/src/reina-core/assets";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { HuntHistoryService, type HuntHistoryRecord } from "@/source/web/src/features/hunt-analyzer/services/hunt-history-service";
import type { VaultServer } from "@/types/vault";

export function ExportCard({
  refEl,
  summary,
  server,
  premium,
  brl
}: {
  refEl: React.RefObject<HTMLDivElement>;
  summary: HuntSummary;
  server: VaultServer | null;
  premium: number;
  brl: number;
}) {
  const topKills = summary.kills.slice(0, 6);
  const topLoot = summary.loot.slice(0, 8);
  const topImbuementLoot = summary.imbuementLootItems.slice(0, 5);
  const sessionDate = summary.sessionStart || summary.sessionLength || new Date().toLocaleDateString("pt-BR");
  const serverName = ReinaEconomyService.getDisplayName(server);
  const profitTone = summary.balance >= 0 ? "#35c9b2" : "#ef6a62";

  return (
    <div
      ref={refEl}
      style={{
        width: 820,
        background:
          "radial-gradient(circle at 12% 0%, rgba(53,201,178,.14), transparent 34%), radial-gradient(circle at 88% 100%, rgba(192,70,63,.13), transparent 36%), linear-gradient(180deg, #151923 0%, #0b0d12 100%)",
        border: "2px solid #c8922a",
        borderRadius: 18,
        color: "#e9ecf2",
        padding: 28,
        fontFamily: "Inter, Arial, sans-serif",
        boxShadow: "0 0 48px rgba(200,146,42,.22)",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 22, borderBottom: "1px solid #3a2a10", paddingBottom: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 54, height: 54, border: "2px solid #a98a45", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#f5c842", fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 900, background: "#1e2330" }}>
            RH
          </div>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 28, letterSpacing: 1.2, color: "#f5c842", fontWeight: 800 }}>ReinaHub</div>
            <div style={{ fontSize: 11, letterSpacing: 2.4, color: "#8c93a3", textTransform: "uppercase", marginTop: 4 }}>Hunt Analyzer Report</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#35c9b2", fontWeight: 800 }}>{serverName}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 6 }}>{sessionDate}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 4 }}>{summary.sessionLength}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ border: "1px solid #c8922a", borderRadius: 14, background: "linear-gradient(160deg, #1e2330, #171b24)", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 8 }}>Balance da sessao</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 36, color: profitTone, fontWeight: 800, lineHeight: 1.1 }}>{integer(summary.balance)} gp</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "#8c93a3" }}>
            <span>Loot {integer(summary.lootValue)} gp</span>
            <span>Supplies {integer(summary.supplies)} gp</span>
            {server ? <span style={{ color: "#f5c842" }}>{money(premium, 4)} {server.moeda}</span> : null}
            {server ? <span style={{ color: "#35c9b2" }}>R$ {money(brl, 2)}</span> : null}
          </div>
        </div>

        <div style={{ border: "1px solid #2a3040", borderRadius: 14, background: "#11151d", padding: 18 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10 }}>Resumo rapido</div>
          <ExportMiniRow label="Duracao" value={summary.sessionLength} />
          <ExportMiniRow label="XP/h" value={integer(summary.xpHour)} />
          <ExportMiniRow label="Kills" value={integer(summary.totalKills)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        <ExportMetric label="XP ganho" value={integer(summary.xpGain)} sub={`${integer(summary.xpHour)} XP/h`} />
        <ExportMetric label="Kills" value={integer(summary.totalKills)} sub={`${summary.kills.length} especies`} />
        <ExportMetric label="Loot" value={`${integer(summary.lootValue)} gp`} sub={`${summary.loot.length} tipos`} />
        <ExportMetric label="Supplies" value={`${integer(summary.supplies)} gp`} sub="custo informado" />
        <ExportMetric label="Damage" value={integer(summary.damage)} sub={`${integer(summary.damageHour)} /h`} />
        <ExportMetric label="Healing" value={integer(summary.healing)} sub="cura total" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ExportSection title="Top monstros">
          {topKills.map((kill) => (
            <ExportRow
              key={kill.Name}
              imagePath={getMonsterImagePath(kill.Name)}
              fallbackImage={MISSING_CREATURE_IMAGE}
              label={kill.Name}
              value={`${integer(kill.Count)}x`}
            />
          ))}
        </ExportSection>

        <ExportSection title="Top loot">
          {topLoot.map((item) => (
            <ExportRow
              key={item.Name}
              imagePath={item.imagePath}
              label={item.Name}
              sub={item.totalSellValue ? `${integer(item.totalSellValue)} gp NPC` : undefined}
              value={`${integer(item.Count)}x`}
            />
          ))}
          {!topLoot.length ? <ExportEmpty /> : null}
        </ExportSection>
      </div>

      {topImbuementLoot.length ? (
        <div style={{ marginTop: 14 }}>
          <ExportSection title="Materiais de imbuement">
            {topImbuementLoot.map((item) => (
              <ExportRow
                key={item.Name}
                imagePath={item.imagePath}
                label={item.Name}
                sub={item.imbuementUsages.slice(0, 2).map((usage) => usage.group).join(", ")}
                value={`${integer(item.Count)}x`}
              />
            ))}
          </ExportSection>
        </div>
      ) : null}

      <ExportFooter />
    </div>
  );
}

export function HistoryExportCard({
  refEl,
  records,
  totals,
  server,
  totalPremium,
  totalBrlVenda,
  itemStats,
  monsterStats,
  periodLabel
}: {
  refEl: React.RefObject<HTMLDivElement>;
  records: HuntHistoryRecord[];
  totals: ReturnType<typeof HuntHistoryService.summarize>;
  server: VaultServer | null;
  totalPremium: number;
  totalBrlVenda: number;
  itemStats: ReturnType<typeof HuntHistoryService.getItemStats>;
  monsterStats: ReturnType<typeof HuntHistoryService.getMonsterStats>;
  periodLabel: string;
}) {
  const firstDate = records.length ? new Date(Math.min(...records.map((record) => record.createdAt))).toLocaleDateString("pt-BR") : "-";
  const lastDate = records.length ? new Date(Math.max(...records.map((record) => record.createdAt))).toLocaleDateString("pt-BR") : "-";
  const serverName = ReinaEconomyService.getDisplayName(server);
  const profitTone = totals.totalBalance >= 0 ? "#35c9b2" : "#ef6a62";

  return (
    <div
      ref={refEl}
      style={{
        width: 920,
        background:
          "radial-gradient(circle at 12% 0%, rgba(53,201,178,.14), transparent 34%), radial-gradient(circle at 88% 100%, rgba(192,70,63,.13), transparent 36%), linear-gradient(180deg, #151923 0%, #0b0d12 100%)",
        border: "2px solid #c8922a",
        borderRadius: 18,
        color: "#e9ecf2",
        padding: 28,
        fontFamily: "Inter, Arial, sans-serif",
        boxShadow: "0 0 48px rgba(200,146,42,.22)",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 22, borderBottom: "1px solid #3a2a10", paddingBottom: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 54, height: 54, border: "2px solid #a98a45", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#f5c842", fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 900, background: "#1e2330" }}>
            RH
          </div>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 28, letterSpacing: 1.2, color: "#f5c842", fontWeight: 800 }}>ReinaHub</div>
            <div style={{ fontSize: 11, letterSpacing: 2.4, color: "#8c93a3", textTransform: "uppercase", marginTop: 4 }}>Hunt History Report</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#35c9b2", fontWeight: 800 }}>{serverName}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 6 }}>{periodLabel}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 4 }}>{firstDate} - {lastDate}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ border: "1px solid #c8922a", borderRadius: 14, background: "linear-gradient(160deg, #1e2330, #171b24)", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 8 }}>Balance acumulado</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 36, color: profitTone, fontWeight: 800, lineHeight: 1.1 }}>{integer(totals.totalBalance)} gp</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "#8c93a3" }}>
            <span>Loot {integer(totals.totalLootValue)} gp</span>
            <span>Supplies {integer(totals.totalSupplies)} gp</span>
            {server ? <span style={{ color: "#f5c842" }}>{money(totalPremium, 4)} {server.moeda}</span> : null}
            {server ? <span style={{ color: "#35c9b2" }}>R$ {money(totalBrlVenda, 2)}</span> : null}
          </div>
        </div>

        <div style={{ border: "1px solid #2a3040", borderRadius: 14, background: "#11151d", padding: 18 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10 }}>Resumo rapido</div>
          <ExportMiniRow label="Hunts" value={integer(totals.huntCount)} />
          <ExportMiniRow label="XP total" value={integer(totals.totalXpGain)} />
          <ExportMiniRow label="XP/h medio" value={integer(totals.averageXpHour)} />
          <ExportMiniRow label="Kills" value={integer(totals.totalKills)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        <ExportMetric label="Hunts salvas" value={integer(totals.huntCount)} sub="no periodo" />
        <ExportMetric label="Loot total" value={`${integer(totals.totalLootValue)} gp`} sub={server ? `${money(ReinaEconomyService.goldToPremium(server, totals.totalLootValue), 4)} ${server.moeda}` : "moeda nao configurada"} />
        <ExportMetric label="Supplies" value={`${integer(totals.totalSupplies)} gp`} sub={server ? `${money(ReinaEconomyService.goldToPremium(server, totals.totalSupplies), 4)} ${server.moeda}` : "moeda nao configurada"} />
        <ExportMetric label="Em reais" value={server ? `R$ ${money(totalBrlVenda, 2)}` : "-"} sub="valor venda estimado" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ExportSection title="Top monstros">
          {monsterStats.slice(0, 8).map((monster) => (
            <ExportRow
              key={monster.name}
              imagePath={getMonsterImagePath(monster.name)}
              fallbackImage={MISSING_CREATURE_IMAGE}
              label={monster.name}
              sub={`${monster.huntCount} hunt(s)`}
              value={`${integer(monster.count)}x`}
            />
          ))}
          {!monsterStats.length ? <ExportEmpty /> : null}
        </ExportSection>

        <ExportSection title="Top loot">
          {itemStats.slice(0, 8).map((item) => (
            <ExportRow
              key={item.name}
              imagePath={item.imagePath ?? undefined}
              label={item.name}
              sub={item.totalSellValue ? `${integer(item.totalSellValue)} gp NPC` : `${item.huntCount} hunt(s)`}
              value={`${integer(item.count)}x`}
            />
          ))}
          {!itemStats.length ? <ExportEmpty /> : null}
        </ExportSection>
      </div>

      <ExportFooter />
    </div>
  );
}

function ExportMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: "#1e2330", border: "1px solid #2a3040", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, color: "#8c93a3", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 17, color: "#35c9b2", fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#5b6175", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function ExportMiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #242a38", padding: "7px 0", fontSize: 12 }}>
      <span style={{ color: "#8c93a3" }}>{label}</span>
      <span style={{ color: "#e9ecf2", fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function ExportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#171b24", border: "1px solid #2a3040", borderRadius: 12, padding: 14 }}>
      <div style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#e8c468", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function ExportRow({
  fallbackImage = MISSING_ITEM_IMAGE,
  imagePath,
  label,
  sub,
  value
}: {
  fallbackImage?: string;
  imagePath?: string;
  label: string;
  sub?: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #242a38", padding: "7px 0", fontSize: 12, alignItems: "center" }}>
      <span style={{ color: "#c6ccd8", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {imagePath ? (
          <img
            src={imagePath}
            alt=""
            width={22}
            height={22}
            onError={(event) => {
              if (event.currentTarget.src.endsWith(fallbackImage)) return;
              event.currentTarget.src = fallbackImage;
            }}
            style={{ width: 22, height: 22, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
          />
        ) : null}
        <span style={{ minWidth: 0 }}>
          <span>{label}</span>
          {sub ? <span style={{ display: "block", color: "#5b6175", fontSize: 10, marginTop: 2 }}>{sub}</span> : null}
        </span>
      </span>
      <span style={{ color: "#f5c842", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function ExportEmpty() {
  return <div style={{ color: "#5b6175", fontSize: 12, padding: "8px 0" }}>Sem dados.</div>;
}

function ExportFooter() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, borderTop: "1px solid #2a3040", marginTop: 18, paddingTop: 12, fontSize: 10, color: "#5b6175" }}>
      <span>Valores ilustrativos. Confirme as cotacoes atuais antes de negociar.</span>
      <span>Generated by ReinaHub</span>
    </div>
  );
}
