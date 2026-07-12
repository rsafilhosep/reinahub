"use client";

import { CharacterProfileService } from "@/source/web/src/features/character-profile/services/character-profile-service";
import type { CharacterProfile } from "@/source/web/src/features/character-profile/types/character-profile.types";
import { ReinaEconomyService, type ReinaEconomyContext } from "@/source/web/src/reina-core/economy";
import { ProfileService, type ReinaProfile } from "@/source/web/src/reina-core/profiles/profile-service";
import type { VaultServer } from "@/types/vault";

export type ReinaActiveContext = {
  economy: ReinaEconomyContext;
  profile: ReinaProfile | null;
  server: VaultServer | null;
  character: CharacterProfile | null;
  profileId: string | null;
  serverId: string | null;
  characterId: string | null;
  displayName: string;
};

export const ReinaActiveContextService = {
  getActiveContext(): ReinaActiveContext {
    const economy = ReinaEconomyService.getActiveContext();
    const profile = economy.profile;
    const character = CharacterProfileService.getActiveCharacter(profile?.id);

    return {
      economy,
      profile,
      server: economy.server,
      character,
      profileId: profile?.id ?? null,
      serverId: economy.serverId,
      characterId: character?.id ?? null,
      displayName: buildDisplayName(profile, economy.serverName, character)
    };
  },

  setActiveProfile(profileId: string) {
    ProfileService.setActiveProfile(profileId);
    const profile = ProfileService.getActiveProfile();
    if (profile.serverId) ReinaEconomyService.setActiveServer(profile.serverId);
    CharacterProfileService.syncActiveCharacterWithProfile(profile.id);
    this.notifyChanged();
    return this.getActiveContext();
  },

  setActiveServer(serverId: string) {
    ReinaEconomyService.setActiveServer(serverId);
    CharacterProfileService.syncActiveCharacterWithProfile(ProfileService.getActiveProfile().id);
    this.notifyChanged();
    return this.getActiveContext();
  },

  setActiveCharacter(characterId: string) {
    CharacterProfileService.setActiveCharacter(characterId);
    this.notifyChanged();
    return this.getActiveContext();
  },

  subscribe(callback: () => void) {
    const unsubscribeEconomy = ReinaEconomyService.subscribe(callback);
    window.addEventListener("reinahub:character-change", callback);
    window.addEventListener("reinahub:active-context-change", callback);
    return () => {
      unsubscribeEconomy();
      window.removeEventListener("reinahub:character-change", callback);
      window.removeEventListener("reinahub:active-context-change", callback);
    };
  },

  notifyChanged() {
    window.dispatchEvent(new Event("reinahub:active-context-change"));
  }
};

function buildDisplayName(profile: ReinaProfile | null, serverName: string, character: CharacterProfile | null) {
  const characterName = character?.name?.trim();
  const profileName = profile?.name?.trim();
  if (characterName) return `${characterName} - ${serverName}`;
  if (profileName) return `${profileName} - ${serverName}`;
  return serverName;
}
