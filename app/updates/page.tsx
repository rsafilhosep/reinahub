import { AppShell } from "@/components/AppShell";
import { ModuleIcon } from "@/components/ModuleIcon";
import { Panel } from "@/components/Panel";
import { REINAHUB_UPDATES } from "@/source/web/src/reina-core/updates/updates";

const categoryLabel: Record<string, string> = {
  major: "Major",
  feature: "Feature",
  data: "Dados",
  ui: "Interface",
  system: "Sistema"
};

export default function UpdatesPage() {
  return (
    <AppShell current="updates" mark="UP" subtitle="Atualizações - novidades do ReinaHub">
      <Panel title="Atualizações do ReinaHub" eyebrow="O que há de novo">
        <p className="note updates-intro">
          Registro simples das melhorias feitas no projeto, para acompanhar a evolução do hub sem depender da memória.
        </p>
        <div className="updates-list">
          {REINAHUB_UPDATES.map((update) => (
            <article className="update-card" key={update.id}>
              <div className="update-icon">
                <ModuleIcon moduleKey={update.category === "data" ? "items" : update.category === "system" ? "cotacao" : "updates"} size={38} />
              </div>
              <div className="update-content">
                <div className="update-meta">
                  <span className={`update-badge update-badge-${update.category}`}>{categoryLabel[update.category]}</span>
                  <time>{update.date}</time>
                </div>
                <h3>{update.title}</h3>
                <p>{update.summary}</p>
                <ul>
                  {update.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
