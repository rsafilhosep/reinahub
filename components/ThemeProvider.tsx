"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { StorageService } from "@/services/storage-service";

export function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = StorageService.getString("vot_theme", "dark");
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    StorageService.setString("vot_theme", next);
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme}>
      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
      <span>{theme === "dark" ? "Modo escuro" : "Modo claro"}</span>
    </button>
  );
}
