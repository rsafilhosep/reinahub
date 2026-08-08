"use client";

import { CheckCircle2, Circle, MessageSquareText, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";
import { StorageService } from "@/services/storage-service";

const storageKey = "reinahub_closed_test_checklist_v1";
const steps = [
  { title: "Primeiro acesso", detail: "Abra o ReinaHub como um novo usuário e conclua — ou pule — o assistente inicial." },
  { title: "Perfil e personagem", detail: "Cadastre seu jogo, mundo e personagem. Confirme se os nomes e orientações são claros." },
  { title: "Cotação", detail: "Informe quem compra e vende a moeda, lote-base, preços e mínimos aceitos." },
  { title: "Calculadora e patrimônio", detail: "Faça uma conversão e confira se gold, moeda premium e reais ficam fáceis de entender." },
  { title: "Stash", detail: "Adicione um item manualmente e, se puder, teste a leitura de um print com nomes visíveis." },
  { title: "Backup", detail: "Exporte seus dados em Configurações e confira se o arquivo foi baixado." },
  { title: "Uso livre", detail: "Explore a ferramenta que mais combina com seu jogo e anote qualquer ponto de dúvida." }
];

export default function TesteFechadoPage() {
  const [completed, setCompleted] = useState<string[]>([]);
  useEffect(() => setCompleted(StorageService.get(storageKey, [])), []);

  function toggle(title: string) {
    const next = completed.includes(title) ? completed.filter((item) => item !== title) : [...completed, title];
    setCompleted(next);
    StorageService.set(storageKey, next);
  }

  function reset() { setCompleted([]); StorageService.set(storageKey, []); }
  const progress = Math.round((completed.length / steps.length) * 100);

  return <AppShell current="closed-test" mark="TF" subtitle="Teste fechado - roteiro dos primeiros usuários">
    <section className="closed-test-hero">
      <div><span className="eyebrow">Ajude a preparar o lançamento</span><h2>Use como você usaria no dia a dia.</h2><p>Não procure apenas erros: marque também qualquer momento em que precisou parar para entender o que fazer.</p></div>
      <div className="closed-test-progress"><strong>{progress}%</strong><span>{completed.length} de {steps.length} etapas</span></div>
    </section>
    <Panel title="Roteiro recomendado" eyebrow="leva aproximadamente 10 minutos">
      <div className="closed-test-list">{steps.map((step, index) => {
        const done = completed.includes(step.title);
        return <button className={`closed-test-step${done ? " done" : ""}`} key={step.title} type="button" onClick={() => toggle(step.title)}>
          {done ? <CheckCircle2 size={23} /> : <Circle size={23} />}<span className="closed-test-number">{index + 1}</span><span><strong>{step.title}</strong><small>{step.detail}</small></span>
        </button>;
      })}</div>
      <div className="quick-row closed-test-actions"><button className="quick-btn primary" type="button" onClick={() => window.dispatchEvent(new Event("reinahub:open-feedback"))}><MessageSquareText size={15} /> Enviar feedback</button><button className="quick-btn" type="button" onClick={reset}><RotateCcw size={15} /> Reiniciar roteiro</button></div>
    </Panel>
    <Panel title="Privacidade durante o teste" eyebrow="seus dados continuam locais"><div className="settings-intro closed-test-privacy"><ShieldCheck size={30} /><div><strong>O roteiro salva somente as etapas marcadas neste navegador.</strong><p>O feedback não inclui automaticamente personagem, preços, stash, históricos ou backup. O testador vê uma prévia antes de enviar.</p></div></div></Panel>
  </AppShell>;
}
