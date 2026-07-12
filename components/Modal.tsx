"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  title,
  eyebrow,
  open,
  onClose,
  children
}: {
  title: string;
  eyebrow?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <h2>{title}</h2>
          <div className="modal-head-actions">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            <button className="icon-btn" type="button" aria-label="Fechar janela" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}
