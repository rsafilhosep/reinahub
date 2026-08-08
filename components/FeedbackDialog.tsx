"use client";

import Link from "next/link";
import { Check, Clipboard, ExternalLink, MessageSquareText, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";

const repositoryIssuesUrl = "https://github.com/rsafilhosep/reinahub/issues/new";

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Problema");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("reinahub:open-feedback", show);
    return () => window.removeEventListener("reinahub:open-feedback", show);
  }, []);

  const report = useMemo(() => {
    const page = typeof window === "undefined" ? "" : window.location.pathname;
    return [`Categoria: ${category}`, `Página: ${page || "não informada"}`, contact.trim() ? `Contato para retorno: ${contact.trim()}` : "Contato para retorno: não informado", "", "Relato:", message.trim()].join("\n");
  }, [category, contact, message]);

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function openIssue() {
    const title = `[${category}] ${message.trim().slice(0, 70) || "Feedback do teste fechado"}`;
    window.open(`${repositoryIssuesUrl}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(report)}`, "_blank", "noopener,noreferrer");
  }

  function close() { setOpen(false); setCopied(false); }

  return <>
    <button className="quick-converter-trigger feedback-trigger" type="button" onClick={() => setOpen(true)}><MessageSquareText size={15} /><span>Feedback</span></button>
    <Modal title="Enviar feedback" eyebrow="teste fechado" open={open} onClose={close}>
      <div className="feedback-dialog">
        <div className="feedback-privacy"><ShieldCheck size={22} /><p><strong>Você escolhe exatamente o que será enviado.</strong> Perfis, cotações, stash e históricos não são anexados automaticamente.</p></div>
        <div className="feedback-form-grid">
          <label><span>Tipo de feedback</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Problema</option><option>Dificuldade de uso</option><option>Sugestão</option><option>Valor ou cálculo incorreto</option><option>Elogio</option></select></label>
          <label><span>Contato para retorno <small>(opcional)</small></span><input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Discord, e-mail ou WhatsApp" /></label>
        </div>
        <label className="feedback-message-field"><span>Conte o que aconteceu</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="O que você tentou fazer? O que esperava? O que aconteceu?" rows={6} /></label>
        <div className="feedback-preview"><span>Prévia do que sairá do navegador</span><pre>{report}</pre></div>
        <div className="feedback-actions">
          <button className="quick-btn primary" type="button" disabled={!message.trim()} onClick={openIssue}><ExternalLink size={15} /> Abrir envio no GitHub</button>
          <button className="quick-btn" type="button" disabled={!message.trim()} onClick={copyReport}>{copied ? <Check size={15} /> : <Clipboard size={15} />} {copied ? "Copiado" : "Copiar para enviar por mensagem"}</button>
          <Link className="quick-btn" href="/teste-fechado" onClick={close}>Ver roteiro de teste</Link>
        </div>
        <p className="note">Ao abrir o GitHub, revise o texto mais uma vez antes de confirmar o envio. Uma conta gratuita do GitHub pode ser necessária.</p>
      </div>
    </Modal>
  </>;
}
