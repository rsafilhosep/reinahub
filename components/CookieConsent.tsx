"use client";

import Link from "next/link";
import { ChevronDown, Cookie, X } from "lucide-react";
import { useEffect, useState } from "react";
import { StorageService } from "@/services/storage-service";

const COOKIE_CONSENT_KEY = "reinahub_cookie_consent_v1";

type ConsentState = "accepted" | "dismissed" | "";

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setConsent(StorageService.getString(COOKIE_CONSENT_KEY, "") as ConsentState);
  }, []);

  function saveConsent(next: ConsentState) {
    setConsent(next);
    StorageService.setString(COOKIE_CONSENT_KEY, next);
  }

  if (consent === "accepted" || consent === "dismissed") return null;

  if (collapsed) {
    return (
      <button className="cookie-consent-tab" type="button" onClick={() => setCollapsed(false)}>
        <Cookie size={15} />
        Cookies
      </button>
    );
  }

  return (
    <aside className="cookie-consent" aria-label="Aviso de cookies e armazenamento local">
      <div className="cookie-consent-icon">
        <Cookie size={20} />
      </div>
      <div className="cookie-consent-body">
        <div className="label">Privacidade e cookies</div>
        <strong>O ReinaHub salva preferencias e dados locais para suas ferramentas funcionarem.</strong>
        <p className="note">
          Usamos armazenamento local para perfil, cotacao, stash, hunts salvas, metas e preferencias. Futuras areas de anuncios ou apoio serao separadas dos dados do jogador.
        </p>
        <div className="cookie-consent-actions">
          <button className="quick-btn primary" type="button" onClick={() => saveConsent("accepted")}>
            Aceitar
          </button>
          <button className="quick-btn" type="button" onClick={() => saveConsent("dismissed")}>
            Agora nao
          </button>
          <Link className="quick-btn" href="/disclaimer">
            Ler isencao
          </Link>
        </div>
      </div>
      <button className="icon-btn" aria-label="Recolher aviso de cookies" type="button" onClick={() => setCollapsed(true)}>
        <ChevronDown size={16} />
      </button>
      <button className="icon-btn" aria-label="Fechar aviso de cookies" type="button" onClick={() => saveConsent("dismissed")}>
        <X size={16} />
      </button>
    </aside>
  );
}
