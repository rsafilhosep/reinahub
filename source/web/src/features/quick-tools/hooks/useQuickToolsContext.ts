"use client";

import { useEffect, useState } from "react";
import { loadServers } from "@/services/quote-service";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService, type ReinaEconomyContext } from "@/source/web/src/reina-core/economy";
import type { CharacterProfile } from "@/source/web/src/features/character-profile/types/character-profile.types";
import type { VaultServer } from "@/types/vault";

export function useQuickToolsContext() {
  const [economy, setEconomy] = useState<ReinaEconomyContext | null>(null);
  const [servers, setServers] = useState<VaultServer[]>([]);
  const [character, setCharacter] = useState<CharacterProfile | null>(null);

  useEffect(() => {
    const sync = () => {
      setEconomy(ReinaEconomyService.getActiveContext());
      setServers(loadServers());
      setCharacter(ReinaActiveContextService.getActiveContext().character);
    };

    sync();
    return ReinaEconomyService.subscribe(sync);
  }, []);

  return { economy, servers, character };
}
