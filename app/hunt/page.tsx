"use client";

import { Download, Eye, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import html2canvas from "html2canvas";
import { ActiveServerBanner } from "@/components/ActiveServerBanner";
import { AppShell } from "@/components/AppShell";
import { MonsterAvatar } from "@/components/GameAvatar";
import { Panel } from "@/components/Panel";
import { integer, money } from "@/services/format";
import { getActiveServer, getServerDisplayName, goldToPremium, premiumToBrl } from "@/services/quote-service";
import type { HuntSummary } from "@/services/hunt-service";
import type { VaultServer } from "@/types/vault";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const MISSING_ITEM_IMAGE = "/assets/icons/missing-item.svg";

export default function HuntPage() {
  const [server, setServer] = useState<VaultServer | null>(null);
  const [summary, setSummary] = useState<HuntSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [innerTab, setInnerTab] = useState("kills");
  const [preview, setPreview] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setServer(getActiveServer());
    sync();
    window.addEventListener("reinahub:quote-change", sync);
    return () => window.removeEventListener("reinahub:quote-change", sync);
  }, []);

  const premium = summary && server ? goldToPremium(server, summary.balance) : 0;
  const brl = server ? premiumToBrl(server, premium, "venda") : 0;

  async function handleFile(file: File) {
    const text = await file.text();
    const hunt = JSON.parse(text);
    const response = await fetch("/api/hunt/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hunt)
    });

    if (!response.ok) {
      throw new Error("Nao foi possivel processar a hunt.");
    }

    setSummary((await response.json()) as HuntSummary);
    setFileName(file.name);
    setPreview(false);
  }

  async function exportPng() {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#0d0a06" });
    const link = document.createElement("a");
    link.download = `hunt-report-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function exportPdf() {
    if (!cardRef.current) return;
    const [{ jsPDF }, canvas] = await Promise.all([
      import("jspdf"),
      html2canvas(cardRef.current, { scale: 2, backgroundColor: "#0d0a06" })
    ]);
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`hunt-report-${Date.now()}.pdf`);
  }

  return (
    <AppShell current="hunt" mark="HA" subtitle="Hunt Analyzer - loot - exportacao">
      <ActiveServerBanner />

      {!summary ? (
        <div className="dropzone">
          <input type="file" accept=".json" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div style={{ fontSize: 42, marginBottom: 14 }}>HA</div>
          <h2 style={{ fontFamily: "var(--font-display)", letterSpacing: 1 }}>Importar Sessao de Hunt</h2>
          <p className="note">Arraste ou selecione um JSON exportado da hunt.</p>
        </div>
      ) : (
        <>
          <Panel title="Sessao de Hunt" eyebrow={fileName || summary.sessionLength}>
            <div className="hero-grid">
              <Hero label="Balance" value={`${integer(summary.balance)} gp`} sub={`Loot ${integer(summary.lootValue)} - Suprimentos ${integer(summary.supplies)}`} tone="gold" />
              <Hero label="XP ganho" value={integer(summary.xpGain)} sub={`${integer(summary.xpHour)} XP/h`} />
              <Hero label="Monstros mortos" value={integer(summary.totalKills)} sub={`${summary.kills.length} especies`} />
              <Hero label="Dano total" value={integer(summary.damage)} sub={`${integer(summary.damageHour)} dano/h`} />
              <Hero label="Duracao" value={summary.sessionLength} sub={summary.sessionStart.split(",")[0] ?? ""} />
              <Hero label="Itens lootados" value={`${summary.loot.length} tipos`} sub={`Cura ${integer(summary.healing)}`} />
            </div>
          </Panel>

          {server ? (
            <div className="conv-strip" style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
              <div><div className="label">Balance</div><div className="value gold">{integer(summary.balance)} gp</div></div>
              <div className="value">=</div>
              <div><div className="label">Em {server.moeda}</div><div className="value gold">{money(premium, 4)}</div></div>
              <div><div className="label">Em reais</div><div className="value">R$ {money(brl, 2)}</div></div>
              <div className="note">via {getServerDisplayName(server)}</div>
            </div>
          ) : null}

          <Panel title="Detalhes da hunt" eyebrow="monstros - loot - grafico">
            <div className="tabs">
              {["kills", "loot", "chart"].map((key) => (
                <button className={`tab-btn${innerTab === key ? " active" : ""}`} key={key} type="button" onClick={() => setInnerTab(key)}>{key}</button>
              ))}
            </div>
            {innerTab === "kills" ? <List rows={summary.kills.map((k) => [k.Name, `${integer(k.Count)}x`])} avatar="monster" /> : null}
            {innerTab === "loot" ? <List rows={summary.loot.map((item) => [item.Name, `${integer(item.Count)}x`, item.imagePath])} avatar="item" /> : null}
            {innerTab === "chart" ? (
              <div className="chart-wrap">
                <Bar
                  data={{
                    labels: summary.kills.slice(0, 10).map((kill) => kill.Name),
                    datasets: [{ data: summary.kills.slice(0, 10).map((kill) => kill.Count), backgroundColor: "#1f8a7a", borderRadius: 6 }]
                  }}
                  options={{ indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                />
              </div>
            ) : null}
          </Panel>

          <Panel title="Exportar card" eyebrow="PNG / PDF">
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={() => setPreview(true)}><Eye size={15} /> Pre-visualizar</button>
              <button className="quick-btn" type="button" onClick={exportPng}><Download size={15} /> Baixar PNG</button>
              <button className="quick-btn" type="button" onClick={exportPdf}><Download size={15} /> Baixar PDF</button>
              <button className="quick-btn danger" type="button" onClick={() => setSummary(null)}><RotateCcw size={15} /> Nova hunt</button>
            </div>
            <div style={{ display: preview ? "flex" : "none", justifyContent: "center", marginTop: 22, overflow: "auto" }}>
              <ExportCard refEl={cardRef} summary={summary} server={server} premium={premium} brl={brl} />
            </div>
          </Panel>
        </>
      )}
    </AppShell>
  );
}

function Hero({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "gold" }) {
  return <div className="hero-card"><div className="label">{label}</div><div className={`value ${tone ?? ""}`}>{value}</div><div className="note">{sub}</div></div>;
}

function List({ rows, avatar }: { rows: Array<[string, string, string?]>; avatar?: "monster" | "item" }) {
  return (
    <div className="history-list">
      {rows.map(([name, value, imagePath]) => (
        <div className="history-item" key={name}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {avatar === "monster" ? <MonsterAvatar name={name} size={32} /> : null}
            {avatar === "item" ? (
              <img
                src={imagePath || MISSING_ITEM_IMAGE}
                alt=""
                width={24}
                height={24}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = MISSING_ITEM_IMAGE;
                }}
                style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
              />
            ) : null}
            {name}
          </span>
          <span style={{ color: "var(--gold)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function ExportCard({
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
  return (
    <div ref={refEl} style={{ width: 620, background: "#0d0a06", border: "3px solid #c8922a", color: "#e8d89a", padding: 22, fontFamily: "var(--font-pixel)", boxShadow: "0 0 40px rgba(200,146,42,.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #c8922a", paddingBottom: 14, marginBottom: 18 }}>
        <div><div style={{ fontSize: 11, letterSpacing: 2, color: "#c8922a" }}>HUNT REPORT</div><div style={{ fontSize: 7, marginTop: 8 }}>{summary.sessionStart || summary.sessionLength}</div></div>
        <div style={{ fontSize: 20 }}>RH</div>
      </div>
      <div style={{ border: "2px solid #c8922a", padding: 16, textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 7, color: "#7a6a3a", marginBottom: 8 }}>BALANCE DA SESSAO</div>
        <div style={{ fontSize: 14, color: "#f5c842" }}>{integer(summary.balance)} gp</div>
        {server ? <div style={{ fontSize: 8, color: "#35c9b2", marginTop: 8 }}>{money(premium, 4)} {server.moeda} - R$ {money(brl, 2)}</div> : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[["XP", integer(summary.xpGain)], ["XP/H", integer(summary.xpHour)], ["KILLS", integer(summary.totalKills)], ["LOOT", integer(summary.lootValue)], ["SUPPLIES", integer(summary.supplies)], ["DAMAGE", integer(summary.damage)]].map(([label, value]) => (
          <div key={label} style={{ background: "#1a1205", border: "1px solid #3a2a10", padding: 10, textAlign: "center" }}><div style={{ fontSize: 6, color: "#7a6a3a" }}>{label}</div><div style={{ fontSize: 8, marginTop: 7 }}>{value}</div></div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 7, color: "#c8922a" }}>TOP 5 MONSTROS</div>
      {summary.kills.slice(0, 5).map((kill) => <div key={kill.Name} style={{ display: "flex", justifyContent: "space-between", fontSize: 7, borderBottom: "1px solid #1e1a0e", padding: "5px 0" }}><span>{kill.Name}</span><span>{integer(kill.Count)}x</span></div>)}
    </div>
  );
}
