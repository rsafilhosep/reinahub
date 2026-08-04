"use client";

import { Download, FileJson, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";
import { BackupService, type BackupSummary, type ReinaHubBackup } from "@/services/backup-service";

export default function ConfiguracoesPage() {
  const [preview, setPreview] = useState<ReinaHubBackup | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [recovery, setRecovery] = useState<BackupSummary | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = BackupService.getRecovery();
    setRecovery(saved ? BackupService.summarize(saved) : null);
  }, []);

  function exportBackup() {
    const backup = BackupService.create();
    BackupService.download(backup);
    setMessage(`Backup exportado com ${Object.keys(backup.entries).length} conjuntos de dados.`);
    setError("");
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("O arquivo é muito grande para um backup do ReinaHub.");
      const parsed = BackupService.parse(await file.text());
      setPreview(parsed);
      setSummary(BackupService.summarize(parsed));
      setError("");
    } catch (nextError) {
      setPreview(null);
      setSummary(null);
      setError(nextError instanceof Error ? nextError.message : "Não foi possível ler o arquivo.");
    }
  }

  function importBackup() {
    if (!preview) return;
    if (!window.confirm("Substituir os dados atuais pelos dados deste backup? Uma cópia de recuperação será criada antes.")) return;
    try {
      BackupService.replace(preview);
      setRecovery(BackupService.summarize(BackupService.getRecovery()!));
      setMessage("Backup restaurado com segurança. A página será recarregada para aplicar os dados.");
      setError("");
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setError("A importação falhou e os dados anteriores foram restaurados automaticamente.");
    }
  }

  function restoreRecovery() {
    if (!window.confirm("Restaurar a cópia criada antes da última importação?")) return;
    try {
      BackupService.restoreRecovery();
      setMessage("Cópia de recuperação restaurada. A página será recarregada.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Não foi possível restaurar a cópia.");
    }
  }

  return (
    <AppShell current="settings" mark="CD" subtitle="Configurações e dados">
      <Panel title="Backup dos seus dados" eyebrow="privado e local">
        <div className="settings-intro">
          <ShieldCheck size={34} />
          <div><strong>Seus dados continuam sob seu controle.</strong><p>O arquivo é criado e lido no seu navegador. Nada é enviado ao ReinaHub.</p></div>
        </div>
        <div className="settings-action-grid">
          <article className="settings-action-card">
            <Download size={26} /><h3>Exportar backup</h3>
            <p>Salva perfis, personagens, servidores, cotações, stash, metas, históricos e preferências em um arquivo JSON.</p>
            <button className="quick-btn primary" type="button" onClick={exportBackup}><Download size={15} /> Exportar agora</button>
          </article>
          <article className="settings-action-card">
            <Upload size={26} /><h3>Importar backup</h3>
            <p>Primeiro você visualiza e valida o conteúdo. Seus dados só mudam após sua confirmação.</p>
            <label className="quick-btn settings-file-button"><FileJson size={15} /> Escolher arquivo<input type="file" accept="application/json,.json" onChange={chooseFile} /></label>
          </article>
        </div>
        {error ? <div className="settings-message error">{error}</div> : null}
        {message ? <div className="settings-message success">{message}</div> : null}
      </Panel>

      {summary && preview ? (
        <Panel title="Pré-visualização do backup" eyebrow="nenhuma alteração realizada">
          <div className="backup-summary-grid">
            <Summary label="Criado em" value={new Date(summary.createdAt).toLocaleString("pt-BR")} />
            <Summary label="Conjuntos de dados" value={String(summary.entryCount)} />
            <Summary label="Tamanho" value={formatBytes(summary.sizeBytes)} />
          </div>
          <div className="backup-category-list">{summary.categories.map((item) => <span key={item.label}>{item.label}<strong>{item.count}</strong></span>)}</div>
          <div className="settings-warning"><strong>Atenção:</strong> a versão segura substitui os dados atuais. Antes disso, o ReinaHub cria automaticamente uma cópia de recuperação.</div>
          <div className="quick-row"><button className="quick-btn primary" type="button" onClick={importBackup}><Upload size={15} /> Substituir e restaurar</button><button className="quick-btn" type="button" onClick={() => { setPreview(null); setSummary(null); }}>Cancelar</button></div>
        </Panel>
      ) : null}

      <Panel title="Cópia de recuperação" eyebrow="proteção automática">
        {recovery ? <><p className="note">Criada em {new Date(recovery.createdAt).toLocaleString("pt-BR")}, antes da última importação.</p><button className="quick-btn" type="button" onClick={restoreRecovery}><RotateCcw size={15} /> Restaurar dados anteriores</button></> : <p className="note">Uma cópia aparecerá aqui automaticamente quando você importar um backup.</p>}
      </Panel>
    </AppShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="backup-summary"><span>{label}</span><strong>{value}</strong></div>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
