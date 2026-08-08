"use client";

import { Check, FileImage, LoaderCircle, Pencil, Plus, ScanText, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { ToolGuide } from "@/components/ToolGuide";
import { currencyShortName, integer, moneySmart } from "@/services/format";
import { loadServers } from "@/services/quote-service";
import { MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { ItemPriceMemoryService, type ItemPriceMemorySuggestion } from "@/source/web/src/reina-core/prices";
import type { VaultServer } from "@/types/vault";
import { ProfileSelector } from "@/source/web/src/reina-core/profiles/ProfileSelector";
import { ProfileService } from "@/source/web/src/reina-core/profiles/profile-service";
import { ItemSearchClientService } from "../../item-database/services/item-search-client-service";
import type { ItemSearchResult } from "../../item-database/types";
import { StashService } from "../services/stash-service";
import { StashPrintDetectorService } from "../services/stash-print-detector-service";
import type { StashItem, StashSortDirection, StashSortKey } from "../types";

const SORT_OPTIONS: Array<{ key: StashSortKey; label: string }> = [
  { key: "name", label: "Nome" },
  { key: "quantity", label: "Quantidade" },
  { key: "unitGoldPrice", label: "GC unitario" },
  { key: "totalGold", label: "GC total" },
  { key: "unitPremium", label: "TC unitario" },
  { key: "totalPremium", label: "TC total" },
  { key: "unitBrl", label: "R$ unitario" },
  { key: "totalBrl", label: "R$ total" }
];

type PrintCandidate = {
  id: string;
  raw: string;
  query: string;
  quantity: number;
  match: ItemSearchResult | null;
  selected: boolean;
};

export function StashPage() {
  const [server, setServer] = useState<VaultServer | null>(null);
  const [items, setItems] = useState<StashItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitGoldPrice, setUnitGoldPrice] = useState(0);
  const [priceSource, setPriceSource] = useState<"npc" | "manual">("manual");
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingStashItem, setEditingStashItem] = useState<StashItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortKey, setSortKey] = useState<StashSortKey>("totalGold");
  const [sortDirection, setSortDirection] = useState<StashSortDirection>("desc");
  const [servers, setServers] = useState<VaultServer[]>([]);
  const [compareServerId, setCompareServerId] = useState("");
  const [error, setError] = useState("");
  const [priceSuggestion, setPriceSuggestion] = useState<ItemPriceMemorySuggestion | null>(null);
  const [printPreviewUrl, setPrintPreviewUrl] = useState("");
  const [printFile, setPrintFile] = useState<File | null>(null);
  const [printCandidates, setPrintCandidates] = useState<PrintCandidate[]>([]);
  const [printProgress, setPrintProgress] = useState(0);
  const [printStatus, setPrintStatus] = useState("");
  const [isDetectingPrint, setIsDetectingPrint] = useState(false);

  useEffect(() => {
    const sync = () => {
      const nextServers = loadServers();
      const profileServer = ProfileService.getProfileServer(ProfileService.getActiveProfile());
      setServers(nextServers);
      setServer(ProfileService.getProfileServer(ProfileService.getActiveProfile()));
      setItems(StashService.loadItems());
      setCompareServerId((current) => current || nextServers.find((row) => row.id !== profileServer?.id)?.id || nextServers[0]?.id || "");
    };
    sync();
    return ReinaEconomyService.subscribe(sync);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setError("");
        setResults(await ItemSearchClientService.searchItems({ query: trimmed, signal: controller.signal }));
      } catch (searchError) {
        if (!controller.signal.aborted) {
      setError(searchError instanceof Error ? searchError.message : "Não foi possível buscar itens.");
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => () => {
    if (printPreviewUrl) URL.revokeObjectURL(printPreviewUrl);
  }, [printPreviewUrl]);

  const totals = useMemo(() => StashService.summarize(items, server), [items, server]);
  const compareServer = useMemo(
    () => servers.find((row) => row.id === compareServerId) ?? null,
    [servers, compareServerId]
  );
  const comparison = useMemo(
    () => StashService.compareQuotes(items, server, compareServer),
    [items, server, compareServer]
  );
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);
  const visibleItems = useMemo(() => {
    const filtered = categoryFilter ? items.filter((item) => item.category === categoryFilter) : items;
    return [...filtered].sort((a, b) => compareStashItems(a, b, sortKey, sortDirection, server));
  }, [items, categoryFilter, sortKey, sortDirection, server]);

  function selectItem(item: ItemSearchResult) {
    setSelectedItem(item);
    setQuery(item.name);
    setResults([]);
    const existing = items.find((stashItem) => stashItem.itemId === item.id);
    const suggestion = ItemPriceMemoryService.getBestPrice(server, item.id, { includeNpc: true });
    const suggestedSource = suggestion
      ? suggestion.source === "npc" ? "npc" : "manual"
      : item.npcPrice ? "npc" : "manual";
    setQuantity(existing?.quantity ?? 1);
    setUnitGoldPrice(existing?.unitGoldPrice ?? suggestion?.value ?? item.npcPrice ?? 0);
    setPriceSource(existing?.priceSource ?? suggestedSource);
    setPriceSuggestion(suggestion);
  }

  function saveItem() {
    if (editingStashItem) {
      updateItem(editingStashItem.itemId, { quantity, unitGoldPrice, priceSource });
      ItemPriceMemoryService.rememberPrice({
        server,
        itemId: editingStashItem.itemId,
        itemName: editingStashItem.name,
        source: priceSource === "npc" ? "npc" : "stash-manual",
        value: unitGoldPrice,
        context: "Stash"
      });
      closeItemModal();
      return;
    }

    if (!selectedItem) {
      setError("Selecione um item da base local antes de salvar.");
      return;
    }

    const next = StashService.upsertItem(items, {
      item: selectedItem,
      quantity,
      unitGoldPrice,
      priceSource
    });
    StashService.saveItems(next);
    ItemPriceMemoryService.rememberPrice({
      server,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      source: priceSource === "npc" ? "npc" : "stash-manual",
      value: unitGoldPrice,
      context: "Stash"
    });
    setItems(next);
    setSelectedItem(null);
    setQuery("");
    setQuantity(1);
    setUnitGoldPrice(0);
    setPriceSource("manual");
    setIsItemModalOpen(false);
    setError("");
  }

  function removeItem(itemId: number) {
    const next = StashService.removeItem(items, itemId);
    StashService.saveItems(next);
    setItems(next);
  }

  function updateItem(itemId: number, patch: Partial<Pick<StashItem, "quantity" | "unitGoldPrice" | "priceSource">>) {
    const next = StashService.updateItem(items, itemId, patch);
    StashService.saveItems(next);
    setItems(next);
  }

  function clearStash() {
    StashService.clearItems();
    setItems([]);
  }

  function choosePrint(file: File | null) {
    if (printPreviewUrl) URL.revokeObjectURL(printPreviewUrl);
    setPrintFile(file);
    setPrintPreviewUrl(file ? URL.createObjectURL(file) : "");
    setPrintCandidates([]);
    setPrintProgress(0);
    setPrintStatus(file ? "Print pronto para analisar." : "");
  }

  async function detectPrintItems() {
    if (!printFile) return;
    setIsDetectingPrint(true);
    setError("");
    setPrintCandidates([]);
    try {
      const text = await StashPrintDetectorService.readText(printFile, (progress, status) => {
        setPrintProgress(progress);
        setPrintStatus(status);
      });
      const lines = StashPrintDetectorService.parseLines(text);
      setPrintStatus("Comparando nomes com a base local...");
      const detected: PrintCandidate[] = [];
      for (const line of lines) {
        const matches = await ItemSearchClientService.searchItems({ query: line.query });
        const match = chooseBestPrintMatch(line.query, matches);
        detected.push({ ...line, match, selected: Boolean(match) });
      }
      setPrintCandidates(detected);
      setPrintProgress(100);
      setPrintStatus(detected.length ? `${detected.filter((row) => row.match).length} item(ns) encontrados para revisão.` : "Nenhum nome de item foi reconhecido. Tente um recorte mais nítido.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Não foi possível analisar o print.");
      setPrintStatus("Falha na leitura. Nenhum dado foi salvo.");
    } finally {
      setIsDetectingPrint(false);
    }
  }

  function saveDetectedItems() {
    let next = items;
    printCandidates.filter((row) => row.selected && row.match).forEach((row) => {
      const match = row.match!;
      const suggestion = ItemPriceMemoryService.getBestPrice(server, match.id, { includeNpc: true });
      const unitGoldPrice = suggestion?.value ?? match.npcPrice ?? 0;
      const priceSource = suggestion
        ? suggestion.source === "npc" ? "npc" : "manual"
        : match.npcPrice ? "npc" : "manual";
      next = StashService.upsertItem(next, { item: match, quantity: row.quantity, unitGoldPrice, priceSource });
    });
    StashService.saveItems(next);
    setItems(next);
    setPrintStatus(`${printCandidates.filter((row) => row.selected && row.match).length} item(ns) adicionados ao stash.`);
    setPrintCandidates([]);
  }

  function openAddItemModal() {
    setEditingStashItem(null);
    setSelectedItem(null);
    setQuery("");
    setResults([]);
    setQuantity(1);
    setUnitGoldPrice(0);
    setPriceSource("manual");
    setError("");
    setIsItemModalOpen(true);
  }

  function openEditItemModal(item: StashItem) {
    setEditingStashItem(item);
    setSelectedItem(null);
    setQuery(item.name);
    setResults([]);
    setQuantity(item.quantity);
    setUnitGoldPrice(item.unitGoldPrice);
    setPriceSource(item.priceSource);
    setPriceSuggestion(ItemPriceMemoryService.getBestPrice(server, item.itemId, { includeNpc: true }));
    setError("");
    setIsItemModalOpen(true);
  }

  function closeItemModal() {
    setIsItemModalOpen(false);
    setEditingStashItem(null);
    setSelectedItem(null);
    setResults([]);
    setPriceSuggestion(null);
    setError("");
  }

  return (
    <>
      <ProfileSelector onChange={() => setItems(StashService.loadItems())} />

      <ToolGuide
        title="Como organizar seu stash"
        summary="Use o perfil ativo, adicione itens manualmente e deixe o ReinaHub calcular GC, moeda premium e reais."
        steps={[
          {
            moduleKey: "characters",
            title: "1. Perfil correto",
            description: "Garanta que personagem, mundo e servidor ativos representam esse stash.",
            href: "/characters"
          },
          {
            moduleKey: "stash",
            title: "2. Adicionar itens",
            description: "Busque o item na base local, informe quantidade e preço unitário em GC."
          },
          {
            moduleKey: "cotacao",
            title: "3. Converter valores",
            description: "A Cotação Central transforma o patrimônio em TC/RC e reais.",
            href: "/cotacao"
          },
          {
            moduleKey: "market",
            title: "4. Revisar preços",
            description: "Use Market Analyzer quando quiser comparar NPC, market e margem.",
            href: "/market"
          }
        ]}
      />

      <Panel title="Patrimônio do stash" eyebrow="base local - manual">
        <div className="slots">
          <ResultSlot label="Itens cadastrados" value={integer(totals.totalItems)} />
          <ResultSlot label="Quantidade total" value={integer(totals.totalQuantity)} />
          <ResultSlot label="Valor total GC" value={`${integer(totals.totalGold)} GC`} tone="gold" />
          <ResultSlot label={server ? `Valor em ${currencyShortName(server.moeda)}` : "Valor em moeda premium"} value={server ? `${moneySmart(totals.totalPremium)} ${currencyShortName(server.moeda)}` : "-"} />
          <ResultSlot label="Valor para vender" value={`R$ ${moneySmart(totals.totalBrlVenda)}`} tone="gold" />
          <ResultSlot label="Custo para comprar" value={`R$ ${moneySmart(totals.totalBrlCompra)}`} />
        </div>
        <p className="note">
          {server ? `Cotação ativa: ${ReinaEconomyService.getDisplayName(server)}.` : "Configure uma cotação ativa para converter GC em moeda premium e reais."}
          {" "}Na Entrada por print, o ReinaHub detecta nomes e quantidades e sempre pede sua revisão antes de adicionar.
        </p>
        <div className="quick-row">
          <button className="quick-btn primary" type="button" onClick={openAddItemModal}>
            <Plus size={15} aria-hidden="true" /> Adicionar item
          </button>
          <Link className="quick-btn" href="/cotacao">Trocar cotação</Link>
        </div>
      </Panel>

      <CollapsiblePanel
        title="Comparar cotação"
        eyebrow="perfil - mundo - conversão"
        summary={
          compareServer
            ? `Recalcule este stash com a cotação de ${ReinaEconomyService.getDisplayName(compareServer)} sem alterar seus itens.`
            : "Compare seu stash com outro servidor/mundo cadastrado."
        }
      >
        <div className="inputs-grid" style={{ marginBottom: 16 }}>
          <Field label="Perfil calculado com">
            <input value={ReinaEconomyService.getDisplayName(server)} readOnly />
          </Field>
          <Field label="Comparar com cotação">
            <select value={compareServerId} onChange={(event) => setCompareServerId(event.target.value)}>
              {servers.map((quoteServer) => (
                <option value={quoteServer.id} key={quoteServer.id}>{ReinaEconomyService.getDisplayName(quoteServer)}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="slots">
          <ResultSlot
            label={server ? `No perfil (${server.moeda})` : "No perfil"}
            value={server ? moneySmart(comparison.base.totalPremium) : "-"}
            tone="gold"
          />
          <ResultSlot
            label={compareServer ? `Na cotação (${compareServer.moeda})` : "Na cotação comparada"}
            value={compareServer ? moneySmart(comparison.compare.totalPremium) : "-"}
          />
          <ResultSlot
            label="Diferença moeda"
            value={compareServer ? formatSigned(comparison.diffPremium, compareServer.moeda) : "-"}
            tone={comparison.diffPremium >= 0 ? "gold" : "red"}
          />
          <ResultSlot
            label="Valor perfil"
            value={`R$ ${moneySmart(comparison.base.totalBrlVenda)}`}
            tone="gold"
          />
          <ResultSlot
            label="Valor comparado"
            value={`R$ ${moneySmart(comparison.compare.totalBrlVenda)}`}
          />
          <ResultSlot
            label="Diferença R$"
            value={`R$ ${formatSignedNumber(comparison.diffBrlVenda)}`}
            tone={comparison.diffBrlVenda >= 0 ? "gold" : "red"}
          />
        </div>
        <p className="note">
          O comparativo usa os mesmos itens do perfil ativo e recalcula com outra cotação cadastrada. Ele não copia nem altera seu Stash.
        </p>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Ações do stash"
        eyebrow="adicionar - limpar"
        summary="Ações manuais para cadastrar itens, limpar o perfil atual ou preparar revisões."
      >
        <div className="quick-row" style={{ marginTop: 0 }}>
          <button className="quick-btn primary" type="button" onClick={openAddItemModal}>
            <Plus size={15} aria-hidden="true" /> Adicionar item ao stash
          </button>
          <button className="quick-btn danger" type="button" onClick={clearStash} disabled={!items.length}>Limpar stash</button>
        </div>
        <p className="note">
          A inclusão e edição de itens agora abre em janela para manter a tabela mais limpa.
        </p>
      </CollapsiblePanel>

      <Modal
        title={editingStashItem ? "Editar item do stash" : "Adicionar item ao stash"}
        eyebrow={editingStashItem ? "quantidade - preço" : "busca - quantidade - preço"}
        open={isItemModalOpen}
        onClose={closeItemModal}
      >
        <div className="inputs-grid">
          {editingStashItem ? (
            <Field label="Item">
              <input value={`${editingStashItem.name} #${editingStashItem.itemId}`} readOnly />
            </Field>
          ) : (
            <Field label="Buscar item">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPriceSuggestion(null);
                }}
                placeholder="Ex: gold coin, dragon ham, steel boots..."
              />
            </Field>
          )}
          <Field label="Quantidade">
            <input type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </Field>
          <Field label="Preço unitário (GC)">
            <input type="number" value={unitGoldPrice} onChange={(event) => { setUnitGoldPrice(Number(event.target.value)); setPriceSource("manual"); }} />
          </Field>
          <Field label="Fonte do preço">
            <select value={priceSource} onChange={(event) => setPriceSource(event.target.value as "npc" | "manual")}>
              <option value="manual">Manual</option>
              <option value="npc">NPC/database</option>
            </select>
          </Field>
        </div>

        <div className="quick-row">
          {[-25, -1, 1, 25].map((step) => (
            <button className="quick-btn" key={step} type="button" onClick={() => setQuantity(Math.max(0, quantity + step))}>
              {step > 0 ? `+${step}` : step}
            </button>
          ))}
        </div>

        {!editingStashItem && results.length ? (
          <div className="history-list" style={{ marginTop: 14 }}>
            {results.slice(0, 8).map((item) => (
              <button className="history-item stash-result-button" key={item.id} type="button" onClick={() => selectItem(item)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={item.image.path}
                    alt=""
                    width={26}
                    height={26}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = MISSING_ITEM_IMAGE;
                    }}
                    style={{ width: 26, height: 26, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
                  />
                  {item.name}
                  <span className="note">#{item.id}</span>
                </span>
                <span style={{ color: "var(--gold)" }}>{item.npcPrice ? `${integer(item.npcPrice)} GC NPC` : "preço manual"}</span>
              </button>
            ))}
          </div>
        ) : null}

        {!editingStashItem && selectedItem ? (
          <div className="note">
            Selecionado: <strong>{selectedItem.name}</strong> #{selectedItem.id}
          </div>
        ) : null}
        {priceSuggestion ? (
          <div className="note">
            Preço sugerido: <strong>{integer(priceSuggestion.value)} GC</strong> via {priceSuggestion.label}.
          </div>
        ) : null}
        {error ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{error}</div> : null}

        <div className="quick-row">
          <button className="quick-btn primary" type="button" onClick={saveItem}>{editingStashItem ? "Salvar alterações" : "Salvar no stash"}</button>
          <button className="quick-btn" type="button" onClick={() => selectedItem?.npcPrice && setUnitGoldPrice(selectedItem.npcPrice)} disabled={!selectedItem?.npcPrice}>
            Usar preço NPC
          </button>
          <button className="quick-btn" type="button" onClick={closeItemModal}>Cancelar</button>
        </div>
      </Modal>

      <CollapsiblePanel
        title="Itens no stash"
        eyebrow="ordenar - filtrar - revisar"
        defaultOpen={items.length <= 8}
        summary={`${integer(visibleItems.length)} item(ns) visíveis de ${integer(items.length)} cadastrados. Valor total: ${integer(totals.totalGold)} GC.`}
      >
        <div className="inputs-grid" style={{ marginBottom: 16 }}>
          <Field label="Categoria">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">Todas</option>
              {categories.map((category) => (
                <option value={category} key={category}>{formatCategory(category)}</option>
              ))}
            </select>
          </Field>
          <Field label="Ordenar por">
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as StashSortKey)}>
              {SORT_OPTIONS.map((option) => (
                <option value={option.key} key={option.key}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Direcao">
            <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as StashSortDirection)}>
              <option value="desc">Maior primeiro</option>
              <option value="asc">Menor primeiro</option>
            </select>
          </Field>
        </div>

        {visibleItems.length ? (
          <StashTable
            items={visibleItems}
            server={server}
            onEditItem={openEditItemModal}
            onRemove={removeItem}
          />
        ) : (
          <EmptyState
            moduleKey="stash"
            title="Seu stash ainda esta vazio"
            description="Adicione o primeiro item para calcular patrimônio em GC, moeda premium e reais usando o perfil ativo."
          />
        )}
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Entrada por print"
        eyebrow="OCR local - revisão obrigatória"
        summary="Envie um print com nomes e quantidades visíveis. Nada é salvo antes da sua confirmação."
      >
        <div className="stash-print-layout">
          <div className="stash-print-upload">
            {printPreviewUrl ? <img src={printPreviewUrl} alt="Prévia do print do stash" /> : <FileImage size={42} aria-hidden="true" />}
            <div>
              <strong>{printFile?.name || "Selecione um print do Stash"}</strong>
              <p>PNG, JPG ou WEBP. Para esta primeira versão, os nomes dos itens precisam estar visíveis no print.</p>
              <div className="quick-row">
                <label className="quick-btn stash-print-file"><FileImage size={15} /> Escolher print<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => choosePrint(event.target.files?.[0] ?? null)} /></label>
                <button className="quick-btn primary" type="button" onClick={detectPrintItems} disabled={!printFile || isDetectingPrint}>
                  {isDetectingPrint ? <LoaderCircle className="spin-icon" size={15} /> : <ScanText size={15} />} {isDetectingPrint ? "Analisando..." : "Detectar itens"}
                </button>
              </div>
            </div>
          </div>
          {printStatus ? <div className="stash-print-status"><span>{printStatus}</span><strong>{printProgress}%</strong><div><i style={{ width: `${printProgress}%` }} /></div></div> : null}
        </div>
        {printCandidates.length ? (
          <div className="stash-print-review">
            <div className="stash-print-review-head"><div><strong>Revise antes de adicionar</strong><span>Desmarque resultados incorretos e ajuste as quantidades.</span></div><span>{printCandidates.filter((row) => row.selected && row.match).length} selecionado(s)</span></div>
            {printCandidates.map((candidate) => (
              <div className={`stash-print-candidate${candidate.match ? "" : " unmatched"}`} key={candidate.id}>
                <input type="checkbox" checked={candidate.selected} disabled={!candidate.match} onChange={(event) => setPrintCandidates((current) => current.map((row) => row.id === candidate.id ? { ...row, selected: event.target.checked } : row))} aria-label={`Selecionar ${candidate.match?.name || candidate.query}`} />
                {candidate.match ? <img src={candidate.match.image.path} alt="" width={34} height={34} /> : <X size={22} />}
                <div><strong>{candidate.match?.name || "Não reconhecido"}</strong><span>{candidate.match ? `Lido como: ${candidate.raw}` : candidate.raw}</span></div>
                <label><span>Qtd.</span><input inputMode="numeric" value={candidate.quantity} onChange={(event) => setPrintCandidates((current) => current.map((row) => row.id === candidate.id ? { ...row, quantity: Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1) } : row))} /></label>
              </div>
            ))}
            <div className="quick-row"><button className="quick-btn primary" type="button" onClick={saveDetectedItems} disabled={!printCandidates.some((row) => row.selected && row.match)}><Check size={15} /> Adicionar selecionados ao stash</button><button className="quick-btn" type="button" onClick={() => setPrintCandidates([])}>Descartar leitura</button></div>
          </div>
        ) : null}
        <p className="note">Privacidade: o OCR roda no seu navegador e a imagem não é armazenada pelo ReinaHub. Prints somente com ícones ainda podem exigir cadastro manual.</p>
      </CollapsiblePanel>
    </>
  );
}

function StashTable({
  items,
  server,
  onEditItem,
  onRemove
}: {
  items: StashItem[];
  server: VaultServer | null;
  onEditItem: (item: StashItem) => void;
  onRemove: (itemId: number) => void;
}) {
  const premiumLabel = abbreviateCurrency(server?.moeda ?? "TC");

  return (
    <div className="stash-table-wrap">
      <table className="stash-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qtd</th>
            <th><span>Unit</span><span>GC</span></th>
            <th><span>Total</span><span>GC</span></th>
            <th title={server?.moeda ?? "TC"}><span>Unit</span><span>{premiumLabel}</span></th>
            <th title={server?.moeda ?? "TC"}><span>Total</span><span>{premiumLabel}</span></th>
            <th><span>Unit</span><span>R$</span></th>
            <th><span>Total</span><span>R$</span></th>
            <th><span>Acoes</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const calculated = StashService.calculateItem(item, server);
            return (
              <tr key={item.id}>
                <td>
                  <Link href={`/items?itemId=${item.itemId}`} className="stash-item-cell">
                    <img
                      src={item.imagePath}
                      alt=""
                      width={28}
                      height={28}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = MISSING_ITEM_IMAGE;
                      }}
                    />
                    <span>
                      <span>{item.name}</span>
                      <small>{formatCategory(item.category)} - #{item.itemId}</small>
                    </span>
                  </Link>
                </td>
                <td>{integer(calculated.quantity)}</td>
                <td>{integer(calculated.unitGold)}</td>
                <td>{integer(calculated.totalGold)}</td>
                <td>{server ? moneySmart(calculated.unitPremium) : "-"}</td>
                <td>{server ? moneySmart(calculated.totalPremium) : "-"}</td>
                <td>{server ? `R$ ${moneySmart(calculated.unitBrlVenda)}` : "-"}</td>
                <td>{server ? `R$ ${moneySmart(calculated.totalBrlVenda)}` : "-"}</td>
                <td>
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      aria-label={`Editar ${item.name}`}
                      className="icon-btn"
                      title={`Editar ${item.name}`}
                      type="button"
                      onClick={() => onEditItem(item)}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`Remover ${item.name}`}
                      className="icon-btn danger"
                      title={`Remover ${item.name}`}
                      type="button"
                      onClick={() => onRemove(item.itemId)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function abbreviateCurrency(currency: string) {
  const trimmed = currency.trim();
  if (!trimmed) return "TC";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0]?.toUpperCase() ?? "").join("").slice(0, 4);
  return trimmed.length > 6 ? trimmed.slice(0, 4).toUpperCase() : trimmed;
}

function compareStashItems(a: StashItem, b: StashItem, key: StashSortKey, direction: StashSortDirection, server: VaultServer | null) {
  const aCalc = StashService.calculateItem(a, server);
  const bCalc = StashService.calculateItem(b, server);
  const multiplier = direction === "asc" ? 1 : -1;
  const values: Record<StashSortKey, [string | number, string | number]> = {
    name: [a.name, b.name],
    quantity: [aCalc.quantity, bCalc.quantity],
    unitGoldPrice: [aCalc.unitGold, bCalc.unitGold],
    totalGold: [aCalc.totalGold, bCalc.totalGold],
    unitPremium: [aCalc.unitPremium, bCalc.unitPremium],
    totalPremium: [aCalc.totalPremium, bCalc.totalPremium],
    unitBrl: [aCalc.unitBrlVenda, bCalc.unitBrlVenda],
    totalBrl: [aCalc.totalBrlVenda, bCalc.totalBrlVenda]
  };
  const [left, right] = values[key];
  if (typeof left === "string" && typeof right === "string") return left.localeCompare(right) * multiplier;
  return (Number(left) - Number(right)) * multiplier;
}

function formatCategory(category: string) {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSigned(value: number, suffix: string) {
  return `${formatSignedNumber(value)} ${suffix}`;
}

function formatSignedNumber(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${moneySmart(value)}`;
}

function chooseBestPrintMatch(query: string, matches: ItemSearchResult[]) {
  if (!matches.length) return null;
  const normalized = normalizePrintName(query);
  const exact = matches.find((item) => normalizePrintName(item.name) === normalized);
  if (exact) return exact;
  const queryWords = normalized.split(" ").filter((word) => word.length > 2);
  return matches.find((item) => {
    const itemName = normalizePrintName(item.name);
    return queryWords.length > 0 && queryWords.every((word) => itemName.includes(word));
  }) ?? null;
}

function normalizePrintName(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
