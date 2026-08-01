"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { CharacterProfileService } from "@/source/web/src/features/character-profile/services/character-profile-service";
import type { CharacterProfile } from "@/source/web/src/features/character-profile/types/character-profile.types";

export function DashboardProfile() {
  const [character, setCharacter] = useState<CharacterProfile | null>(null);

  useEffect(() => {
    const sync = () => setCharacter(CharacterProfileService.getActiveCharacter());
    sync();
    window.addEventListener("reinahub:character-change", sync);
    return () => window.removeEventListener("reinahub:character-change", sync);
  }, []);

  return (
    <Link className="dashboard-profile" href="/characters" aria-label="Abrir perfil do personagem">
      <div className="dashboard-profile-avatar" aria-hidden="true">
        {character?.name?.slice(0, 2).toUpperCase() || "RH"}
        <span>{character?.level || 1}</span>
      </div>
      <div className="dashboard-profile-copy">
        <small>Bem-vindo de volta,</small>
        <strong>{character?.name || "Aventureiro"} <Crown size={13} /></strong>
        <span>{character ? `${character.vocation} de ${character.world}` : "Configure seu personagem"}</span>
      </div>
    </Link>
  );
}
