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
import { getLatestUpdates } from "@/source/web/src/reina-core/updates/updates";

const quickAccess = [
  {
    moduleKey: "hunt",
    title: "Analisar hunt",
    description: "Importar sessão, calcular profit e gerar card.",
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
    description: "Salvar char, mundo, vocação, level e progresso de experiência.",
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
    description: "Preço NPC, drops, NPCs e imagens locais.",
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
    status: "essencial",
    moduleKey: "cotacao",
    title: "Defina o perfil econômico",
    description: "Escolha o servidor/mundo ativo para TC, RC, gold e reais ficarem iguais em todo o hub.",
    href: "/cotacao",
    action: "Ajustar cotação"
  },
  {
    step: "2",
    status: "recomendado",
    moduleKey: "characters",
    title: "Vincule seu personagem",
    description: "Salve char, plataforma, mundo, level e meta de XP para as ferramentas usarem o mesmo contexto.",
    href: "/characters",
    action: "Abrir Characters"
  },
  {
    step: "3",
    status: "principal",
    moduleKey: "hunt",
    title: "Importe uma hunt",
    description: "Cole ou envie arquivos de sessão para calcular profit, XP, loot e gerar o card PNG/PDF.",
    href: "/hunt",
    action: "Analisar hunt"
  },
  {
    step: "4",
    status: "opcional",
    moduleKey: "stash",
    title: "Organize seus itens",
    description: "Use o Stash para acompanhar patrimônio por perfil e comparar valores em gold, moeda premium e reais.",
    href: "/stash",
    action: "Abrir Stash"
  },
  {
    step: "5",
    status: "opcional",
    moduleKey: "premium-goals",
    title: "Crie uma meta",
    description: "Transforme VIP, Premium, item ou objetivo de live em progresso claro para jogar com direção.",
    href: "/premium-goals",
    action: "Criar meta"
  }
];

const intentCards = [
  {
    moduleKey: "cotacao",
    title: "Quero converter dinheiro",
    description: "Abra o conversor rapido ou ajuste a cotacao ativa para TC, RC, GC e R$.",
    href: "/cotacao",
    action: "Economia"
  },
  {
    moduleKey: "hunt",
    title: "Quero analisar uma hunt",
    description: "Cole ou importe uma sessao para ver profit, XP, loot, imbuements e exportar card.",
    href: "/hunt",
    action: "Hunt"
  },
  {
    moduleKey: "stash",
    title: "Quero saber quanto tenho",
    description: "Use o Stash para somar itens por perfil e comparar em gold, moeda premium e reais.",
    href: "/stash",
    action: "Patrimonio"
  },
  {
    moduleKey: "premium-goals",
    title: "Quero comprar Premium/VIP",
    description: "Calcule quanto falta em TC/RC, gold, reais e acompanhe progresso.",
    href: "/premium-goals",
    action: "Metas"
  },
  {
    moduleKey: "monsters",
    title: "Quero pesquisar criatura",
    description: "Veja XP, vida, loot, imagem e ligacoes com itens e hunts.",
    href: "/monsters",
    action: "Biblioteca"
  },
  {
    moduleKey: "equipment",
    title: "Quero comparar equipamento",
    description: "Filtre por level, vocacao, peso, slots, ataque e defesa.",
    href: "/equipment",
    action: "Equipamento"
  },
  {
    moduleKey: "imbuement",
    title: "Quero revisar imbuements",
    description: "Consulte materiais, preco NPC, preco de Market e relacao com hunts.",
    href: "/imbuements",
    action: "Imbuements"
  },
  {
    moduleKey: "live-goal",
    title: "Quero mostrar objetivo na live",
    description: "Crie overlay com meta de gold, TC/RC, item e criaturas para stream.",
    href: "/live-goal",
    action: "Overlay"
  }
];

const sections = [
  {
    title: "Ferramentas",
    description: "Análises e calculadoras para transformar sessões, mercado e cotações em decisão prática.",
    cards: [
      { key: "hunt", title: "Hunt Analyzer", description: "Importe JSON de hunt, calcule loot, balance, XP e exporte relatórios.", href: "/hunt" },
      { key: "loot", title: "Loot Analyzer", description: "Análise de loot consolidada a partir da base local.", status: "em breve" },
      { key: "market", title: "Market Analyzer", description: "Compare preço NPC, preço de market, taxas e margem.", href: "/market" },
      { key: "stash", title: "Stash", description: "Organize itens, quantidades e patrimônio usando a base local e a cotação ativa.", href: "/stash" },
      { key: "characters", title: "Characters", description: "Cadastre personagens, mundos, vocação, level e XP para futuras integrações.", href: "/characters" },
      { key: "imbuement", title: "Imbuements", description: "Consulte materiais e custo NPC dos imbuements iniciais.", href: "/imbuements" },
      { key: "cotacao", title: "Cotação Central", description: "Servidor ativo, Tibia Coins, gold e conversões do ReinaHub.", href: "/cotacao" }
    ]
  },
  {
    title: "Biblioteca",
    description: "Base local reutilizável para itens, monstros, bosses, NPCs e futuras ferramentas.",
    cards: [
      { key: "monsters", title: "Monster Database", description: "Consulte monstros, vida, experiência, loot e assets.", href: "/monsters" },
      { key: "items", title: "Item Database", description: "Consulte itens, preço NPC e monstros que dropam.", href: "/items" },
      { key: "equipment", title: "Equipment Database", description: "Compare armas, shields e sets por level, ataque, defesa, slots e peso.", href: "/equipment" },
      { key: "npcs", title: "NPC Hub", description: "Consulte NPCs, itens comprados, itens vendidos e relações com a biblioteca.", href: "/npcs" },
      { key: "bosses", title: "Boss Database", description: "Base futura de bosses, loot especial, timers e locais.", status: "placeholder" }
    ]
  },
  {
    title: "Economia",
    description: "Camada econômica para TC, gold, reais, histórico, profit e comparações.",
    cards: [
      { key: "rc", title: "Tibia Coins", description: "Calculadora RC/Tibia Coin baseada no servidor ativo.", href: "/calculadora-rc" },
      { key: "premium-goals", title: "Premium Goals", description: "Calcule quanto falta para comprar VIP, Premium e produtos de moeda premium.", href: "/premium-goals" },
      { key: "live-goal", title: "Live Goal", description: "Janela de objetivo para live, video e captura no OBS.", href: "/live-goal" },
      { key: "stash", title: "Patrimônio", description: "Veja quanto seu stash representa em gold, moeda premium e reais.", href: "/stash" },
      { key: "cotacao", title: "Conversões", description: "Converta gold, Tibia Coins e reais usando a Cotação Central.", href: "/cotacao" },
      { key: "market", title: "Histórico", description: "Histórico futuro de cotações, análises e preços.", status: "placeholder" }
    ]
  },
  {
    title: "Studio",
    description: "Área futura para gerar materiais visuais, cards e exportações do ReinaHub.",
    cards: [
      { key: "hunt", title: "Exportações", description: "Saídas PNG/PDF para hunts, reports e comparativos.", status: "placeholder" },
      { key: "live-goal", title: "Overlay de objetivo", description: "Meta visual para stream, TikTok Live e YouTube.", href: "/live-goal" },
      { key: "assets", title: "Cards", description: "Cards visuais para resultados, loot e sessões.", status: "placeholder" }
    ]
  },
  {
    title: "Administração",
    description: "Ferramentas internas para manter dados, assets e fontes brutas organizados.",
    cards: [
      { key: "assets", title: "Assets", description: "Cache, scanner e prioridade de imagens locais.", href: "/assets" },
      { key: "items", title: "Repository", description: "Biblioteca bruta e scanners seguros de referência.", status: "relatórios" },
      { key: "cotacao", title: "Importadores", description: "Pipelines XML/Lua futuros para dados locais.", status: "scripts" },
      { key: "market", title: "Validações", description: "Relatórios de integridade da base e assets.", status: "scripts" }
    ]
  }
];

const assetTotals = assetsReport.totals;
const latestUpdates = getLatestUpdates(3);

export default function Home() {
  return (
    <AppShell current="home" mark="RH" subtitle="Dashboard - arquitetura do ReinaHub">
      <section className="home-intro">
        <div>
          <div className="eyebrow">Hub central</div>
          <h2>O mapa rapido do seu ReinaHub.</h2>
          <p className="note">
            Comece pelo que voce quer resolver agora. As ferramentas usam o mesmo perfil, cotacao e base local de dados.
          </p>
        </div>
        <div className="home-intro-actions">
          <Link className="quick-btn primary" href="/hunt">Começar por Hunt</Link>
          <Link className="quick-btn" href="/cotacao">Ajustar cotação</Link>
        </div>
      </section>

      <Panel title="O que voce quer fazer agora?" eyebrow="Mapa do hub">
        <div className="intent-grid">
          {intentCards.map((card) => (
            <Link className="intent-card" href={card.href} key={card.title}>
              <ModuleIcon moduleKey={card.moduleKey} size={34} />
              <div>
                <div className="label">{card.action}</div>
                <div className="value small" style={{ color: "var(--gold)" }}>{card.title}</div>
                <div className="note">{card.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Comece por aqui" eyebrow="Primeiro uso">
        <p className="note" style={{ marginTop: -4, marginBottom: 16 }}>
          Um caminho simples para usar o ReinaHub sem se perder nas ferramentas.
        </p>
        <div className="onboarding-flow">
          {onboardingSteps.map((step) => (
            <Link className="onboarding-step" href={step.href} key={step.title}>
              <div className="onboarding-step-index">{step.step}</div>
              <ModuleIcon moduleKey={step.moduleKey} size={34} />
              <div className="onboarding-step-body">
                <div className="onboarding-step-meta">
                  <span className="label">{step.action}</span>
                  <span className="status-pill">{step.status}</span>
                </div>
                <div className="value small" style={{ color: "var(--gold)" }}>{step.title}</div>
                <div className="note">{step.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Atualizações recentes" eyebrow="O que há de novo">
        <div className="updates-preview-head">
          <p className="note">
            Um resumo das últimas melhorias para você acompanhar o rumo do projeto.
          </p>
          <Link className="quick-btn" href="/updates">Ver todas</Link>
        </div>
        <div className="updates-preview-grid">
          {latestUpdates.map((update) => (
            <Link className="update-preview-card" href="/updates" key={update.id}>
              <div className="dashboard-card-head">
                <ModuleIcon moduleKey="updates" size={38} />
                <div>
                  <div className="label">{update.date}</div>
                  <div className="value small" style={{ color: "var(--gold)" }}>{update.title}</div>
                </div>
              </div>
              <div className="note">{update.summary}</div>
            </Link>
          ))}
        </div>
      </Panel>

      <div className="hero-grid" style={{ marginBottom: 22 }}>
        <Stat label="Itens na base" value={formatNumber(items.length)} sub="items.json" tone="gold" />
        <Stat label="Monstros na base" value={formatNumber(monsters.length)} sub="monsters.json" />
        <Stat label="NPCs na base" value={formatNumber(npcs.length)} sub="npcs.json" />
        <Stat
          label="Assets encontrados"
          value={formatNumber(assetTotals.itemImagesFound + assetTotals.monsterImagesFound)}
          sub="itens e monstros"
        />
        <Stat label="Última atualização" value="-" sub="placeholder" />
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
          <div className="label">{status ?? "disponível"}</div>
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
