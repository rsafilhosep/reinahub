"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function CollapsiblePanel({
  title,
  eyebrow,
  defaultOpen = false,
  summary,
  children
}: {
  title: string;
  eyebrow?: string;
  defaultOpen?: boolean;
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`panel collapsible-panel${open ? " is-open" : ""}`}>
      <div className="panel-head collapsible-panel-head">
        <div>
          <h2>{title}</h2>
          {summary ? <div className="collapsible-panel-summary">{summary}</div> : null}
        </div>
        <div className="collapsible-panel-actions">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <button className="quick-btn" type="button" onClick={() => setOpen((value) => !value)}>
            <ChevronDown size={15} aria-hidden="true" />
            {open ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
      {open ? <div className="collapsible-panel-content">{children}</div> : null}
    </section>
  );
}
