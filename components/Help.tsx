"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { HELP_SETTINGS_EVENT, HelpSettingsService } from "@/services/help-settings-service";

export function useHelpEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(HelpSettingsService.isEnabled());

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      setEnabled(typeof detail?.enabled === "boolean" ? detail.enabled : HelpSettingsService.isEnabled());
    };

    window.addEventListener(HELP_SETTINGS_EVENT, onChange);
    return () => window.removeEventListener(HELP_SETTINGS_EVENT, onChange);
  }, []);

  return enabled;
}

export function HelpToggle() {
  const enabled = useHelpEnabled();

  return (
    <button
      className={`help-toggle${enabled ? " active" : ""}`}
      type="button"
      onClick={() => HelpSettingsService.toggle()}
      aria-pressed={enabled}
      title={enabled ? "Desativar ajudas da tela" : "Ativar ajudas da tela"}
    >
      <HelpCircle size={15} aria-hidden="true" />
      <span>{enabled ? "Ajuda ligada" : "Ajuda desligada"}</span>
    </button>
  );
}

export function HelpTip({ text }: { text: string }) {
  const enabled = useHelpEnabled();
  if (!enabled) return null;

  return (
    <span className="help-tip">
      <HelpCircle size={14} aria-hidden="true" />
      <span className="help-popover">{text}</span>
    </span>
  );
}
