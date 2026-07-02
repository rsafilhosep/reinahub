"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Panel } from "@/components/Panel";
import { integer, money } from "@/services/format";
import {
  SPRITE_CACHE_KEY,
  clearSprites,
  fetchSprite,
  loadSpriteCache,
  loadSpriteMeta,
  queueCreatures,
  resetSpriteErrors
} from "@/services/sprite-service";
import { StorageService } from "@/services/storage-service";
import type { HuntSession, SpriteMeta } from "@/types/vault";

export default function AssetsPage() {
  const [cache, setCache] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<Record<string, SpriteMeta>>({});
  const [filter, setFilter] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function refresh() {
    setCache(loadSpriteCache());
    setMeta(loadSpriteMeta());
  }

  useEffect(refresh, []);

  const names = useMemo(() => Object.keys(meta).filter((name) => name.toLowerCase().includes(filter.toLowerCase())).sort(), [meta, filter]);
  const pending = Object.keys(meta).filter((name) => meta[name].status === "pending");
  const errors = Object.values(meta).filter((item) => item.status === "error").length;
  const bytes = StorageService.bytes(SPRITE_CACHE_KEY);

  async function importJson(file: File) {
    const data = JSON.parse(await file.text()) as HuntSession;
    const monsters = (data.KilledMonsters ?? []).map((monster) => monster.Name).filter(Boolean);
    const added = queueCreatures(monsters);
    setLog((old) => [`${added} criatura(s) adicionada(s) da hunt.`, ...old]);
    refresh();
  }

  function addManual() {
    if (!manual.trim()) return;
    const added = queueCreatures([manual.trim()]);
    setManual("");
    setLog((old) => [`${added} criatura adicionada manualmente.`, ...old]);
    refresh();
  }

  async function fetchAll() {
    setBusy(true);
    for (const name of pending) {
      setLog((old) => [`Baixando ${name}...`, ...old]);
      await fetchSprite(name);
      refresh();
    }
    setBusy(false);
  }

  return (
    <AppShell current="assets" mark="AM" subtitle="Assets Manager - cache de sprites">
      <div className="hero-grid" style={{ marginBottom: 22 }}>
        <Stat label="Sprites em cache" value={integer(Object.keys(cache).length)} sub="criaturas salvas" />
        <Stat label="Tamanho do cache" value={`${money(bytes / 1024, 1)} KB`} sub="localStorage" tone="gold" />
        <Stat label="Pendentes" value={integer(pending.length)} sub="fila de download" />
        <Stat label="Com erro" value={integer(errors)} sub="sprites nao encontrados" tone="red" />
      </div>

      <Panel title="Importar criaturas" eyebrow="JSON de hunt ou manual">
        <div className="import-zone">
          <input type="file" accept=".json" multiple onChange={(e) => Array.from(e.target.files ?? []).forEach(importJson)} />
          <strong>Arraste JSON de hunt ou clique para selecionar</strong>
          <p className="note">Os nomes de monstros entram na fila e os sprites ficam em cache local.</p>
        </div>
        <div className="inputs-grid" style={{ marginTop: 18 }}>
          <Field label="Adicionar criatura manualmente">
            <input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} placeholder="Werehyaena" />
          </Field>
        </div>
        <div className="quick-row">
          <button className="quick-btn primary" type="button" disabled={busy || pending.length === 0} onClick={fetchAll}>{busy ? "Baixando..." : `Baixar ${pending.length} pendente(s)`}</button>
          <button className="quick-btn" type="button" onClick={() => { resetSpriteErrors(); refresh(); }}>Tentar erros novamente</button>
          <button className="quick-btn danger" type="button" onClick={() => { clearSprites(); refresh(); }}>Limpar cache</button>
        </div>
        <div className="history-list" style={{ marginTop: 16 }}>
          {log.slice(0, 4).map((entry, index) => <div className="history-item" key={`${entry}-${index}`}>{entry}</div>)}
        </div>
      </Panel>

      <Panel title="Sprites em cache" eyebrow={`${names.length} criatura(s)`}>
        <Field label="Filtrar por nome"><input value={filter} onChange={(e) => setFilter(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10, marginTop: 16 }}>
          {names.length ? names.map((name) => (
            <div className="sprite-card" key={name} style={{ padding: 10, textAlign: "center", minHeight: 96 }}>
              {cache[name] ? <img src={cache[name]} alt={name} style={{ width: 32, height: 32, imageRendering: "pixelated" }} /> : <div className="value small">{meta[name].status}</div>}
              <div className="note" style={{ wordBreak: "break-word" }}>{name}</div>
            </div>
          )) : <div className="empty-msg">Nenhum sprite cadastrado ainda.</div>}
        </div>
      </Panel>
    </AppShell>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "gold" | "red" }) {
  return <div className="hero-card"><div className="label">{label}</div><div className={`value ${tone ?? ""}`}>{value}</div><div className="note">{sub}</div></div>;
}
