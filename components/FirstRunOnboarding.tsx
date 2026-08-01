"use client";

import { ArrowRight, Building2, Check, Coins, Compass, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ManualPriceSourceService } from "@/services/manual-price-source-service";
import { saveServers, setActiveServerId } from "@/services/quote-service";
import { StorageService } from "@/services/storage-service";
import { CharacterProfileService } from "@/source/web/src/features/character-profile/services/character-profile-service";
import type { CharacterPlatform } from "@/source/web/src/features/character-profile/types/character-profile.types";
import { ProfileService } from "@/source/web/src/reina-core/profiles/profile-service";
import type { ServerKind, VaultServer } from "@/types/vault";

const ONBOARDING_KEY = "reinahub_first_run_v5";

type GameChoice = "Tibia Global" | "RubinOT" | "Outro servidor";

const games: Array<{ value: GameChoice; currency: string; kind: ServerKind }> = [
  { value: "Tibia Global", currency: "Tibia Coin", kind: "global" },
  { value: "RubinOT", currency: "Rubini Coin", kind: "ot" },
  { value: "Outro servidor", currency: "Moeda VIP", kind: "ot" }
];

export function FirstRunOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [game, setGame] = useState<GameChoice>("Tibia Global");
  const [world, setWorld] = useState("");
  const [currency, setCurrency] = useState("Tibia Coin");
  const [goldPerCoin, setGoldPerCoin] = useState("40000");
  const [lotSize, setLotSize] = useState("25");
  const [sameCompany, setSameCompany] = useState(false);
  const [sellerCompany, setSellerCompany] = useState("");
  const [sellerPrice, setSellerPrice] = useState("");
  const [sellerMinimum, setSellerMinimum] = useState("25");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [buyerPrice, setBuyerPrice] = useState("");
  const [buyerMinimum, setBuyerMinimum] = useState("25");

  useEffect(() => {
    setOpen(!StorageService.getString(ONBOARDING_KEY, ""));
    const reopen = () => {
      setStep(1);
      setOpen(true);
    };
    window.addEventListener("reinahub:open-onboarding", reopen);
    return () => window.removeEventListener("reinahub:open-onboarding", reopen);
  }, []);

  const selectedGame = useMemo(() => games.find((item) => item.value === game) ?? games[0], [game]);
  const canContinue = step === 1
    ? Boolean(name.trim())
    : step === 2
      ? Boolean(world.trim() && currency.trim())
      : step === 3
        ? Number(goldPerCoin) > 0
        : Boolean(Number(lotSize) > 0 && sellerCompany.trim() && Number(sellerPrice) > 0 && Number(sellerMinimum) > 0 && Number(buyerPrice) > 0 && Number(buyerMinimum) > 0 && (sameCompany || buyerCompany.trim()));

  function chooseGame(next: GameChoice) {
    const choice = games.find((item) => item.value === next) ?? games[0];
    setGame(next);
    setCurrency(choice.currency);
    setSameCompany(next === "RubinOT");
  }

  function skip() {
    StorageService.setString(ONBOARDING_KEY, "skipped");
    setOpen(false);
  }

  function finish() {
    const timestamp = Date.now();
    const serverId = `srv-welcome-${timestamp}`;
    const baseLot = Math.max(1, Number(lotSize) || 1);
    const sellerMinimumQuantity = Math.max(1, Number(sellerMinimum) || baseLot);
    const buyerMinimumQuantity = Math.max(1, Number(buyerMinimum) || baseLot);
    const sellerBaseLotPrice = (Number(sellerPrice) / sellerMinimumQuantity) * baseLot;
    const buyerBaseLotPrice = (Number(buyerPrice) / buyerMinimumQuantity) * baseLot;
    const server: VaultServer = {
      id: serverId,
      nome: world.trim(),
      plataforma: game === "Outro servidor" ? "OTServer" : game,
      mundo: world.trim(),
      tipo: selectedGame.kind,
      moeda: currency.trim(),
      lote: baseLot,
      gcPorMoeda: Math.max(0, Number(goldPerCoin) || 0),
      loteVenda: buyerBaseLotPrice,
      loteCompra: sellerBaseLotPrice
    };

    saveServers([server]);
    setActiveServerId(serverId);
    const profile = ProfileService.createProfile(name, serverId);
    const character = CharacterProfileService.getActiveCharacter(profile.id);
    CharacterProfileService.saveCharacter({
      ...character,
      name: name.trim(),
      profileId: profile.id,
      platform: mapCharacterPlatform(game),
      world: world.trim(),
      linkedServerId: serverId
    });
    if (sameCompany) {
      ManualPriceSourceService.save({ serverId, label: sellerCompany, kind: "reseller", url: "", loteVenda: buyerBaseLotPrice, loteCompra: sellerBaseLotPrice, minimumPlayerSellQuantity: buyerMinimumQuantity, minimumPlayerBuyQuantity: sellerMinimumQuantity, note: "Empresa informada no primeiro acesso: compra e vende moeda premium." }, `price-welcome-both-${timestamp}`);
    } else {
      ManualPriceSourceService.save({ serverId, label: sellerCompany, kind: "reseller", url: "", loteVenda: 0, loteCompra: sellerBaseLotPrice, minimumPlayerSellQuantity: 0, minimumPlayerBuyQuantity: sellerMinimumQuantity, note: "Empresa informada no primeiro acesso: vende moeda premium ao jogador." }, `price-welcome-seller-${timestamp}`);
      ManualPriceSourceService.save({ serverId, label: buyerCompany, kind: "reseller", url: "", loteVenda: buyerBaseLotPrice, loteCompra: 0, minimumPlayerSellQuantity: buyerMinimumQuantity, minimumPlayerBuyQuantity: 0, note: "Empresa informada no primeiro acesso: compra moeda premium do jogador." }, `price-welcome-buyer-${timestamp}`);
    }
    StorageService.setString(ONBOARDING_KEY, "completed");
    window.dispatchEvent(new Event("reinahub:quote-change"));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="welcome-backdrop" role="presentation">
      <section className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="welcome-art" aria-hidden="true">
          <div className="welcome-art-mark">RH</div>
          <div>
            <span>Seu reino de ferramentas</span>
            <strong>Uma configuração.<br />Todo o Hub conectado.</strong>
          </div>
        </div>

        <div className="welcome-content">
          <button className="welcome-skip-icon" type="button" onClick={skip} aria-label="Explorar sem configurar"><X size={17} /></button>
          <div className="welcome-progress" aria-label={`Etapa ${step} de 4`}>
            {[1, 2, 3, 4].map((item) => <span className={item <= step ? "active" : ""} key={item} />)}
          </div>
          <div className="eyebrow">Primeiros passos · {step}/4</div>

          {step === 1 ? (
            <div className="welcome-step">
              <Sparkles size={28} />
              <h2 id="welcome-title">Bem-vindo ao ReinaHub</h2>
              <p>Vamos preparar as ferramentas para o seu jogo. Leva menos de um minuto.</p>
              <label className="field">
                <span>Como podemos chamar você?</span>
                <div className="welcome-input"><UserRound size={17} /><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome ou personagem" /></div>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="welcome-step">
              <Compass size={28} />
              <h2 id="welcome-title">Onde você joga?</h2>
              <p>Isso organiza seu perfil, mundo e moeda premium em todo o Hub.</p>
              <label className="field"><span>Jogo</span><select value={game} onChange={(event) => chooseGame(event.target.value as GameChoice)}>{games.map((item) => <option key={item.value}>{item.value}</option>)}</select></label>
              <div className="welcome-field-grid">
                <label className="field"><span>Mundo / servidor</span><input value={world} onChange={(event) => setWorld(event.target.value)} placeholder="Ex.: Yubra, Elysian..." /></label>
                <label className="field"><span>Moeda premium</span><input value={currency} onChange={(event) => setCurrency(event.target.value)} /></label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="welcome-step">
              <Coins size={28} />
              <h2 id="welcome-title">Qual é a cotação no Market?</h2>
              <p>Informe quanto vale uma unidade de {currency || "moeda premium"} em gold. Você poderá alterar isso quando quiser.</p>
              <label className="field">
                <span>Gold por 1 {currency || "moeda"}</span>
                <div className="welcome-input"><Coins size={17} /><input inputMode="numeric" value={goldPerCoin} onChange={(event) => setGoldPerCoin(event.target.value.replace(/[^0-9]/g, ""))} /></div>
              </label>
              <div className="welcome-ready"><Check size={17} /> Com isso, conversores, metas, hunts e patrimônio já estarão conectados.</div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="welcome-step welcome-step-quotes">
              <Building2 size={28} />
              <h2 id="welcome-title">Quem compra e vende?</h2>
              <p>Informe o preço do lote-base e o mínimo aceito por cada empresa. O padrão é 25 {currency || "moedas premium"}.</p>
              <div className="welcome-field-grid welcome-lot-grid">
                <label className="field"><span>Quantidade no lote-base</span><input inputMode="numeric" value={lotSize} onChange={(event) => setLotSize(event.target.value.replace(/[^0-9]/g, ""))} /></label>
                <label className="welcome-check"><input type="checkbox" checked={sameCompany} onChange={(event) => setSameCompany(event.target.checked)} /><span>A mesma empresa compra e vende</span></label>
              </div>
              <div className="welcome-company-card">
                <strong>Empresa que vende para o jogador</strong>
                <div className="welcome-company-grid">
                  <label className="field"><span>Empresa / site</span><input value={sellerCompany} onChange={(event) => setSellerCompany(event.target.value)} placeholder="Nome do vendedor" /></label>
                  <label className="field"><span>Preço total do mínimo</span><input type="number" min="0" step="0.000001" value={sellerPrice} onChange={(event) => setSellerPrice(event.target.value)} placeholder="R$" /></label>
                  <label className="field"><span>Mínimo que vende</span><input inputMode="numeric" value={sellerMinimum} onChange={(event) => setSellerMinimum(event.target.value.replace(/[^0-9]/g, ""))} placeholder="25" /></label>
                </div>
                {sameCompany ? (
                  <div className="welcome-field-grid welcome-same-price">
                    <label className="field"><span>Preço total do mínimo</span><input type="number" min="0" step="0.000001" value={buyerPrice} onChange={(event) => setBuyerPrice(event.target.value)} placeholder="R$" /></label>
                    <label className="field"><span>Mínimo que compra</span><input inputMode="numeric" value={buyerMinimum} onChange={(event) => setBuyerMinimum(event.target.value.replace(/[^0-9]/g, ""))} placeholder="25" /></label>
                  </div>
                ) : null}
              </div>
              {!sameCompany ? (
                <div className="welcome-company-card">
                  <strong>Empresa que compra do jogador</strong>
                  <div className="welcome-company-grid">
                    <label className="field"><span>Empresa / site</span><input value={buyerCompany} onChange={(event) => setBuyerCompany(event.target.value)} placeholder="Nome do comprador" /></label>
                    <label className="field"><span>Preço total do mínimo</span><input type="number" min="0" step="0.000001" value={buyerPrice} onChange={(event) => setBuyerPrice(event.target.value)} placeholder="R$" /></label>
                    <label className="field"><span>Mínimo que compra</span><input inputMode="numeric" value={buyerMinimum} onChange={(event) => setBuyerMinimum(event.target.value.replace(/[^0-9]/g, ""))} placeholder="25" /></label>
                  </div>
                </div>
              ) : null}
              <div className="welcome-quote-preview">
                <span>Empresa vende: {formatQuotePreview(sellerPrice, sellerMinimum, lotSize)}</span>
                <span>Empresa compra: {formatQuotePreview(buyerPrice, buyerMinimum, lotSize)}</span>
              </div>
            </div>
          ) : null}

          <div className="welcome-actions">
            <button className="quick-btn" type="button" onClick={skip}>Explorar sem configurar</button>
            {step > 1 ? <button className="quick-btn" type="button" onClick={() => setStep(step - 1)}>Voltar</button> : null}
            <button className="quick-btn primary" type="button" disabled={!canContinue} onClick={() => step < 4 ? setStep(step + 1) : finish()}>
              {step < 4 ? <>Continuar <ArrowRight size={16} /></> : <>Entrar no ReinaHub <Check size={16} /></>}
            </button>
          </div>
          <small className="welcome-privacy">Seus dados ficam somente neste navegador.</small>
        </div>
      </section>
    </div>
  );
}

function mapCharacterPlatform(game: GameChoice): CharacterPlatform {
  if (game === "Tibia Global" || game === "RubinOT") return game;
  return "OTServer";
}

function formatQuotePreview(total: string, minimum: string, baseLot: string) {
  const totalValue = Number(total) || 0;
  const minimumValue = Number(minimum) || 0;
  const baseLotValue = Number(baseLot) || 0;
  if (!totalValue || !minimumValue || !baseLotValue) return "preencha preço e mínimo";
  const normalized = (totalValue / minimumValue) * baseLotValue;
  return `${minimumValue} moedas por ${formatBrl(totalValue)} → lote-base ${baseLotValue} = ${formatBrl(normalized)}`;
}

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);
}
