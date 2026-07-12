import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { AppShell } from "@/components/AppShell";
import { DashboardCardVisual } from "@/components/DashboardCardVisual";
import { ModuleIcon } from "@/components/ModuleIcon";
import { Panel } from "@/components/Panel";
import { SupportSlot } from "@/components/SupportSlot";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE, getItemImagePath, getMonsterImagePath } from "@/source/web/src/reina-core/assets";
import assetsReport from "@/source/web/src/reina-core/assets/generated/assets-report.json";
import items from "@/source/web/src/reina-core/database/generated/items.json";
import monsters from "@/source/web/src/reina-core/database/generated/monsters.json";
import npcs from "@/source/web/src/reina-core/database/generated/npcs.json";

const quickAccess = [
  {
    moduleKey: "hunt",
    title: "Analisar hunt",
    description: "Importar sessao, calcular profit e gerar card.",
    href: "/hunt",
    action: "Abrir Hunt Analyzer"
  },
  {
    moduleKey: "stash",
    title: "Ver meu stash",
    description: "Organizar itens, quantidades e valor total.",
    href: "/stash",
    action: "Abrir Stash"
  },
  {
    moduleKey: "characters",
    title: "Meu personagem",
    description: "Salvar char, mundo, vocacao, level e progresso de experiencia.",
    href: "/characters",
    action: "Abrir Characters"
  },
  {
    moduleKey: "monsters",
    title: "Buscar monstro",
    description: "Loot, XP, vida, assets e links para itens.",
    href: "/monsters",
    action: "Abrir Monstros"
  },
  {
    moduleKey: "items",
    title: "Buscar item",
    description: "Preco NPC, drops, NPCs e imagens locais.",
    href: "/items",
    action: "Abrir Itens"
  },
  {
    moduleKey: "live-goal",
    title: "Objetivo de live",
    description: "Mostre uma meta de item, TC, RC ou gold em overlay.",
    href: "/live-goal",
    action: "Criar Overlay"
  }
];

const onboardingSteps = [
  {
    step: "1",
    moduleKey: "cotacao",
    title: "Defina o perfil economico",
    description: "Escolha o servidor/mundo ativo para TC, RC, gold e reais ficarem iguais em todo o hub.",
    href: "/cotacao",
    action: "Ajustar cotacao"
  },
  {
    step: "2",
    moduleKey: "characters",
    title: "Vincule seu personagem",
    description: "Salve char, plataforma, mundo, level e meta de XP para as ferramentas usarem o mesmo contexto.",
    href: "/characters",
    action: "Abrir Characters"
  },
  {
    step: "3",
    moduleKey: "hunt",
    title: "Importe uma hunt",
    description: "Cole ou envie arquivos de sessao para calcular profit, XP, loot e gerar o card PNG/PDF.",
    href: "/hunt",
    action: "Analisar hunt"
  },
  {
    step: "4",
    moduleKey: "stash",
    title: "Organize seus itens",
    description: "Use o Stash para acompanhar patrimonio por perfil e comparar valores em gold, moeda premium e reais.",
    href: "/stash",
    action: "Abrir Stash"
  },
  {
    step: "5",
    moduleKey: "premium-goals",
    title: "Crie uma meta",
    description: "Transforme VIP, Premium, item ou objetivo de live em progresso claro para jogar com direcao.",
    href: "/premium-goals",
    action: "Criar meta"
  }
];

const sections = [
  {
    title: "Ferramentas",
    description: "Analises e calculadoras para transformar sessoes, mercado e cotacoes em decisao pratica.",
    cards: [
      { key: "hunt", title: "Hunt Analyzer", description: "Importe JSON de hunt, calcule loot, balance, XP e exporte relatorios.", href: "/hunt" },
      { key: "loot", title: "Loot Analyzer", description: "Analise de loot consolidada a partir da base local.", status: "em breve" },
      { key: "market", title: "Market Analyzer", description: "Compare preco NPC, preco de market, taxas e margem.", href: "/market" },
      { key: "stash", title: "Stash", description: "Organize itens, quantidades e patrimonio usando a base local e a cotacao ativa.", href: "/stash" },
      { key: "characters", title: "Characters", description: "Cadastre personagens, mundos, vocacao, level e XP para futuras integracoes.", href: "/characters" },
      { key: "imbuement", title: "Imbuements", description: "Consulte materiais e custo NPC dos imbuements iniciais.", href: "/imbuements" },
      { key: "cotacao", title: "Cotacao Central", description: "Servidor ativo, Tibia Coins, gold e conversoes do ReinaHub.", href: "/cotacao" }
    ]
  },
  {
    title: "Biblioteca",
    description: "Base local reutilizavel para itens, monstros, bosses, NPCs e futuras ferramentas.",
    cards: [
      { key: "monsters", title: "Monster Database", description: "Consulte monstros, vida, experiencia, loot e assets.", href: "/monsters" },
      { key: "items", title: "Item Database", description: "Consulte itens, preco NPC e monstros que dropam.", href: "/items" },
      { key: "npcs", title: "NPC Hub", description: "Consulte NPCs, itens comprados, itens vendidos e relacoes com a biblioteca.", href: "/npcs" },
      { key: "bosses", title: "Boss Database", description: "Base futura de bosses, loot especial, timers e locais.", status: "placeholder" }
    ]
  },
  {
    title: "Economia",
    description: "Camada economica para TC, gold, reais, historico, profit e comparacoes.",
    cards: [
      { key: "rc", title: "Tibia Coins", description: "Calculadora RC/Tibia Coin baseada no servidor ativo.", href: "/calculadora-rc" },
      { key: "premium-goals", title: "Premium Goals", description: "Calcule quanto falta para comprar VIP, Premium e produtos de moeda premium.", href: "/premium-goals" },
      { key: "live-goal", title: "Live Goal", description: "Janela de objetivo para live, video e captura no OBS.", href: "/live-goal" },
      { key: "stash", title: "Patrimonio", description: "Veja quanto seu stash representa em gold, moeda premium e reais.", href: "/stash" },
      { key: "cotacao", title: "Conversoes", description: "Converta gold, Tibia Coins e reais usando a Cotacao Central.", href: "/cotacao" },
      { key: "market", title: "Historico", description: "Historico futuro de cotacoes, analises e precos.", status: "placeholder" }
    ]
  },
  {
    title: "Studio",
    description: "Area futura para gerar materiais visuais, cards e exportacoes do ReinaHub.",
    cards: [
      { key: "hunt", title: "Exportacoes", description: "Saidas PNG/PDF para hunts, reports e comparativos.", status: "placeholder" },
      { key: "live-goal", title: "Overlay de objetivo", description: "Meta visual para stream, TikTok Live e YouTube.", href: "/live-goal" },
      { key: "assets", title: "Cards", description: "Cards visuais para resultados, loot e sessoes.", status: "placeholder" }
    ]
  },
  {
    title: "Administracao",
    description: "Ferramentas internas para manter dados, assets e fontes brutas organizados.",
    cards: [
      { key: "assets", title: "Assets", description: "Cache, scanner e prioridade de imagens locais.", href: "/assets" },
      { key: "items", title: "Repository", description: "Biblioteca bruta e scanners seguros de referencia.", status: "relatorios" },
      { key: "cotacao", title: "Importadores", description: "Pipelines XML/Lua futuros para dados locais.", status: "scripts" },
      { key: "market", title: "Validacoes", description: "Relatorios de integridade da base e assets.", status: "scripts" }
    ]
  }
];

const assetTotals = assetsReport.totals;

export default function Home() {
  return (
    <AppShell current="home" mark="RH" subtitle="Dashboard - arquitetura do ReinaHub">
      <section className="home-intro">
        <div>
          <div className="eyebrow">Hub central</div>
          <h2>Escolha uma ferramenta e continue daqui.</h2>
          <p className="note">
            O ReinaHub organiza hunts, mercado, biblioteca e patrimonio usando a mesma base local de dados.
          </p>
        </div>
        <div className="home-intro-actions">
          <Link className="quick-btn primary" href="/hunt">Comecar por Hunt</Link>
          <Link className="quick-btn" href="/cotacao">Ajustar cotacao</Link>
        </div>
      </section>

      <Panel title="Comece por aqui" eyebrow="Primeiro uso">
        <p className="note" style={{ marginTop: -4, marginBottom: 16 }}>
          Um caminho simples para usar o ReinaHub sem se perder nas ferramentas.
        </p>
        <div className="onboarding-flow">
          {onboardingSteps.map((step) => (
            <Link className="onboarding-step" href={step.href} key={step.title}>
              <div className="onboarding-step-index">{step.step}</div>
              <ModuleIcon moduleKey={step.moduleKey} size={38} />
              <div className="onboarding-step-body">
                <div className="label">{step.action}</div>
                <div className="value small" style={{ color: "var(--gold)" }}>{step.title}</div>
                <div className="note">{step.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <div className="quick-access-grid">
        {quickAccess.map((card) => (
          <QuickAccessCard key={card.moduleKey} {...card} />
        ))}
      </div>

      <div className="hero-grid" style={{ marginBottom: 22 }}>
        <Stat label="Itens na base" value={formatNumber(items.length)} sub="items.json" tone="gold" />
        <Stat label="Monstros na base" value={formatNumber(monsters.length)} sub="monsters.json" />
        <Stat label="NPCs na base" value={formatNumber(npcs.length)} sub="npcs.json" />
        <Stat
          label="Assets encontrados"
          value={formatNumber(assetTotals.itemImagesFound + assetTotals.monsterImagesFound)}
          sub="itens e monstros"
        />
        <Stat label="Ultima atualizacao" value="-" sub="placeholder" />
      </div>
      <AdSlot placement="home-after-stats" />
      <SupportSlot placement="home-support" />

      {sections.map((section, index) => (
        <div key={section.title}>
          <Panel title={section.title} eyebrow="ReinaHub">
            <p className="note" style={{ marginTop: -4, marginBottom: 16 }}>
              {section.description}
            </p>
            <div className="dashboard-section-grid">
              {section.cards.map(({ key: moduleKey, ...card }) => (
                <DashboardCard key={card.title} {...card} moduleKey={moduleKey} />
              ))}
            </div>
          </Panel>
          {index === 0 ? <AdSlot placement="home-after-tools" /> : null}
        </div>
      ))}
      <AdSlot placement="home-footer" />
    </AppShell>
  );
}

function QuickAccessCard({
  moduleKey,
  title,
  description,
  href,
  action
}: {
  moduleKey: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Link className="quick-access-card" href={href}>
      <CardVisual moduleKey={moduleKey} />
      <div className="dashboard-card-head">
        <ModuleIcon moduleKey={moduleKey} size={44} />
        <div>
          <div className="label">{action}</div>
          <div className="value small" style={{ color: "var(--gold)" }}>{title}</div>
        </div>
      </div>
      <div className="note">{description}</div>
    </Link>
  );
}

function DashboardCard({
  moduleKey,
  title,
  description,
  href,
  status
}: {
  moduleKey: string;
  title: string;
  description: string;
  href?: string;
  status?: string;
}) {
  const content = (
    <>
      <CardVisual moduleKey={moduleKey} muted={!href} />
      <div className="dashboard-card-head">
        <ModuleIcon moduleKey={moduleKey} size={40} />
        <div>
          <div className="label">{status ?? "disponivel"}</div>
          <div className="value small" style={{ color: href ? "var(--gold)" : "var(--ink-dim)" }}>
            {title}
          </div>
        </div>
      </div>
      <div className="note">{description}</div>
    </>
  );

  if (!href) {
    return (
      <div className="dashboard-card is-muted">
        {content}
      </div>
    );
  }

  return (
    <Link className="dashboard-card" href={href}>
      {content}
    </Link>
  );
}

function CardVisual({ moduleKey, muted = false }: { moduleKey: string; muted?: boolean }) {
  const visual = getCardVisual(moduleKey);
  if (!visual) return null;

  return <DashboardCardVisual fallback={visual.fallback} muted={muted} src={visual.src} />;
}

function getCardVisual(moduleKey: string) {
  const item = (itemId: number) => ({ src: getItemImagePath(itemId), fallback: MISSING_ITEM_IMAGE });
  const monster = (name: string) => ({ src: getMonsterImagePath(name), fallback: MISSING_CREATURE_IMAGE });

  const visuals: Record<string, { src: string; fallback: string }> = {
    hunt: monster("Mooh'Tah Warrior"),
    stash: item(8863),
    characters: item(3577),
    monsters: monster("Dragon"),
    items: item(3554),
    "live-goal": item(3043),
    loot: item(3031),
    market: item(7425),
    imbuement: item(12683),
    cotacao: item(3043),
    rc: item(3035),
    "premium-goals": item(3043),
    npcs: item(3031),
    bosses: monster("Ferumbras"),
    assets: item(3359)
  };

  return visuals[moduleKey] ?? null;
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
