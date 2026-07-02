import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";
import assetsReport from "@/source/web/src/reina-core/assets/generated/assets-report.json";
import items from "@/source/web/src/reina-core/database/generated/items.json";
import monsters from "@/source/web/src/reina-core/database/generated/monsters.json";

const sections = [
  {
    title: "Ferramentas",
    description: "Analises e calculadoras para transformar sessoes, mercado e cotacoes em decisao pratica.",
    cards: [
      { title: "Hunt Analyzer", description: "Importe JSON de hunt, calcule loot, balance, XP e exporte relatorios.", href: "/hunt" },
      { title: "Loot Analyzer", description: "Analise de loot consolidada a partir da base local.", status: "em breve" },
      { title: "Market Analyzer", description: "Compare preco NPC, preco de market, taxas e margem.", href: "/market" },
      { title: "Cotacao Central", description: "Servidor ativo, Tibia Coins, gold e conversoes do ReinaHub.", href: "/cotacao" }
    ]
  },
  {
    title: "Biblioteca",
    description: "Base local reutilizavel para itens, monstros, bosses, NPCs e futuras ferramentas.",
    cards: [
      { title: "Monster Database", description: "Consulte monstros, vida, experiencia, loot e assets.", href: "/monsters" },
      { title: "Item Database", description: "Consulte itens, preco NPC e monstros que dropam.", href: "/items" },
      { title: "NPC Database", description: "Base futura de NPCs, lojas, dialogos e servicos.", status: "placeholder" },
      { title: "Boss Database", description: "Base futura de bosses, loot especial, timers e locais.", status: "placeholder" }
    ]
  },
  {
    title: "Economia",
    description: "Camada economica para TC, gold, reais, historico, profit e comparacoes.",
    cards: [
      { title: "Tibia Coins", description: "Calculadora RC/Tibia Coin baseada no servidor ativo.", href: "/calculadora-rc" },
      { title: "Conversoes", description: "Converta gold, Tibia Coins e reais usando a Cotacao Central.", href: "/cotacao" },
      { title: "Historico", description: "Historico futuro de cotacoes, analises e precos.", status: "placeholder" }
    ]
  },
  {
    title: "Studio",
    description: "Area futura para gerar materiais visuais, cards e exportacoes do ReinaHub.",
    cards: [
      { title: "Exportacoes", description: "Saidas PNG/PDF para hunts, reports e comparativos.", status: "placeholder" },
      { title: "Cards", description: "Cards visuais para resultados, loot e sessoes.", status: "placeholder" }
    ]
  },
  {
    title: "Administracao",
    description: "Ferramentas internas para manter dados, assets e fontes brutas organizados.",
    cards: [
      { title: "Assets", description: "Cache, scanner e prioridade de imagens locais.", href: "/assets" },
      { title: "Repository", description: "Biblioteca bruta e scanners seguros de referencia.", status: "relatorios" },
      { title: "Importadores", description: "Pipelines XML/Lua futuros para dados locais.", status: "scripts" },
      { title: "Validacoes", description: "Relatorios de integridade da base e assets.", status: "scripts" }
    ]
  }
];

const assetTotals = assetsReport.totals;

export default function Home() {
  return (
    <AppShell current="home" mark="RH" subtitle="Dashboard - arquitetura do ReinaHub">
      <div className="hero-grid" style={{ marginBottom: 22 }}>
        <Stat label="Itens na base" value={formatNumber(items.length)} sub="items.json" tone="gold" />
        <Stat label="Monstros na base" value={formatNumber(monsters.length)} sub="monsters.json" />
        <Stat label="NPCs na base" value="-" sub="preparado para importacao" />
        <Stat
          label="Assets encontrados"
          value={formatNumber(assetTotals.itemImagesFound + assetTotals.monsterImagesFound)}
          sub="itens e monstros"
        />
        <Stat label="Ultima atualizacao" value="-" sub="placeholder" />
      </div>

      {sections.map((section) => (
        <Panel title={section.title} eyebrow="ReinaHub" key={section.title}>
          <p className="note" style={{ marginTop: -4, marginBottom: 16 }}>
            {section.description}
          </p>
          <div className="market-grid">
            {section.cards.map((card) => (
              <DashboardCard key={card.title} {...card} />
            ))}
          </div>
        </Panel>
      ))}
    </AppShell>
  );
}

function DashboardCard({
  title,
  description,
  href,
  status
}: {
  title: string;
  description: string;
  href?: string;
  status?: string;
}) {
  const content = (
    <>
      <div className="label">{status ?? "disponivel"}</div>
      <div className="value small" style={{ color: href ? "var(--gold)" : "var(--ink-dim)" }}>
        {title}
      </div>
      <div className="note">{description}</div>
    </>
  );

  if (!href) {
    return (
      <div className="market-card" style={{ opacity: 0.72, minHeight: 132 }}>
        {content}
      </div>
    );
  }

  return (
    <Link className="market-card" href={href} style={{ display: "block", minHeight: 132, textDecoration: "none" }}>
      {content}
    </Link>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "gold" | "red" }) {
  return (
    <div className="hero-card">
      <div className="label">{label}</div>
      <div className={`value ${tone ?? ""}`}>{value}</div>
      <div className="note">{sub}</div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
