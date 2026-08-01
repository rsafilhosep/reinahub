import Link from "next/link";
import { BarChart3, Boxes, Coins, HeartHandshake, Swords } from "lucide-react";

export function GlobalSupportRail() {
  return (
    <aside className="global-support-rail" aria-label="Espacos futuros de apoio ao ReinaHub">
      <div className="support-slot support-slot-compact support-slot-art">
        <div className="label">Apoio voluntario</div>
        <div className="support-slot-title">Doacoes futuras</div>
        <div className="note">Area preparada para quem quiser apoiar o ReinaHub sem bloquear ferramentas.</div>
        <button className="rail-action" type="button" disabled><HeartHandshake size={16} /> Quero apoiar</button>
      </div>
      <div className="ad-slot ad-slot-compact">
        <div className="label">Espaco reservado</div>
        <div className="ad-slot-title">Parceiro / anuncio</div>
        <div className="note">Espaco futuro para parceiros relevantes, separado dos dados do jogador.</div>
      </div>
      <div className="rail-status-card">
        <div className="label">Status do hub</div>
        <div><span>Base de dados</span><strong>Atualizada</strong></div>
        <div><span>Ferramentas</span><strong>Online</strong></div>
        <div><span>Ambiente</span><strong>Estavel</strong></div>
      </div>
      <nav className="rail-quick-links" aria-label="Acesso rapido">
        <div className="label">Acesso rapido</div>
        <Link href="/cotacao"><Coins size={15} /> Converter TC e R$ <span>›</span></Link>
        <Link href="/market"><BarChart3 size={15} /> Market Analyzer <span>›</span></Link>
        <Link href="/hunt"><Swords size={15} /> Hunt Analyzer <span>›</span></Link>
        <Link href="/stash"><Boxes size={15} /> Stash <span>›</span></Link>
      </nav>
    </aside>
  );
}
