"use client";

import { ArrowRight, Check, Coins, Compass, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { saveServers, setActiveServerId } from "@/services/quote-service";
import { StorageService } from "@/services/storage-service";
import { CharacterProfileService } from "@/source/web/src/features/character-profile/services/character-profile-service";
import type { CharacterPlatform } from "@/source/web/src/features/character-profile/types/character-profile.types";
import { ProfileService } from "@/source/web/src/reina-core/profiles/profile-service";
import type { ServerKind, VaultServer } from "@/types/vault";

const ONBOARDING_KEY = "reinahub_first_run_v1";

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

  useEffect(() => {
    setOpen(!StorageService.getString(ONBOARDING_KEY, ""));
  }, []);

  const selectedGame = useMemo(() => games.find((item) => item.value === game) ?? games[0], [game]);
  const canContinue = step === 1 ? Boolean(name.trim()) : step === 2 ? Boolean(world.trim() && currency.trim()) : Number(goldPerCoin) > 0;

  function chooseGame(next: GameChoice) {
    const choice = games.find((item) => item.value === next) ?? games[0];
    setGame(next);
    setCurrency(choice.currency);
  }

  function skip() {
    StorageService.setString(ONBOARDING_KEY, "skipped");
    setOpen(false);
  }

  function finish() {
    const timestamp = Date.now();
    const serverId = `srv-welcome-${timestamp}`;
    const server: VaultServer = {
      id: serverId,
      nome: world.trim(),
      plataforma: game === "Outro servidor" ? "OTServer" : game,
      mundo: world.trim(),
      tipo: selectedGame.kind,
      moeda: currency.trim(),
      lote: 1,
      gcPorMoeda: Math.max(0, Number(goldPerCoin) || 0),
      loteVenda: 0,
      loteCompra: 0
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
          <div className="welcome-progress" aria-label={`Etapa ${step} de 3`}>
            {[1, 2, 3].map((item) => <span className={item <= step ? "active" : ""} key={item} />)}
          </div>
          <div className="eyebrow">Primeiros passos · {step}/3</div>

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

          <div className="welcome-actions">
            <button className="quick-btn" type="button" onClick={skip}>Explorar sem configurar</button>
            {step > 1 ? <button className="quick-btn" type="button" onClick={() => setStep(step - 1)}>Voltar</button> : null}
            <button className="quick-btn primary" type="button" disabled={!canContinue} onClick={() => step < 3 ? setStep(step + 1) : finish()}>
              {step < 3 ? <>Continuar <ArrowRight size={16} /></> : <>Entrar no ReinaHub <Check size={16} /></>}
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
