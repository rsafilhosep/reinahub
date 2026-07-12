"use client";

import { getActiveServer, getServerDisplayName, loadServers } from "@/services/quote-service";
import { StorageService } from "@/services/storage-service";

export type ReinaProfile = {
  id: string;
  name: string;
  serverId: string;
  createdAt: number;
  updatedAt: number;
};

export const REINA_PROFILES_KEY = "reinahub_profiles";
export const ACTIVE_REINA_PROFILE_KEY = "reinahub_active_profile";

export const ProfileService = {
  loadProfiles() {
    const profiles = StorageService.get<ReinaProfile[]>(REINA_PROFILES_KEY, []);
    if (profiles.length) return profiles.map(normalizeProfile);
    const initial = createDefaultProfile();
    StorageService.set(REINA_PROFILES_KEY, [initial]);
    StorageService.setString(ACTIVE_REINA_PROFILE_KEY, initial.id);
    return [initial];
  },

  getActiveProfile() {
    const profiles = this.loadProfiles();
    const activeId = StorageService.getString(ACTIVE_REINA_PROFILE_KEY, "");
    return profiles.find((profile) => profile.id === activeId) ?? profiles[0] ?? createDefaultProfile();
  },

  setActiveProfile(profileId: string) {
    StorageService.setString(ACTIVE_REINA_PROFILE_KEY, profileId);
    window.dispatchEvent(new Event("reinahub:profile-change"));
  },

  setActiveProfileServer(serverId: string) {
    const profile = this.getActiveProfile();
    if (!profile) return null;
    const nextProfile = this.saveProfile({
      ...profile,
      serverId,
      updatedAt: Date.now()
    });
    return nextProfile;
  },

  saveProfile(profile: ReinaProfile) {
    const nextProfile = normalizeProfile({ ...profile, updatedAt: Date.now() });
    const profiles = this.loadProfiles();
    const exists = profiles.some((row) => row.id === nextProfile.id);
    const next = exists ? profiles.map((row) => (row.id === nextProfile.id ? nextProfile : row)) : [...profiles, nextProfile];
    StorageService.set(REINA_PROFILES_KEY, next);
    StorageService.setString(ACTIVE_REINA_PROFILE_KEY, nextProfile.id);
    window.dispatchEvent(new Event("reinahub:profile-change"));
    return nextProfile;
  },

  createProfile(name: string, serverId?: string) {
    return this.saveProfile({
      id: `profile-${Date.now()}`,
      name: name.trim() || "Novo perfil",
      serverId: serverId || getActiveServer()?.id || "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  },

  getProfileServer(profile: ReinaProfile | null) {
    if (!profile) return getActiveServer();
    return loadServers().find((server) => server.id === profile.serverId) ?? getActiveServer();
  },

  getProfileLabel(profile: ReinaProfile | null) {
    if (!profile) return "Perfil nao definido";
    const server = this.getProfileServer(profile);
    return server ? `${profile.name} - ${getServerDisplayName(server)}` : profile.name;
  }
};

function createDefaultProfile(): ReinaProfile {
  const server = getActiveServer();
  return {
    id: "profile-default",
    name: server ? getServerDisplayName(server) : "Perfil principal",
    serverId: server?.id ?? "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function normalizeProfile(profile: ReinaProfile): ReinaProfile {
  return {
    ...profile,
    id: profile.id || `profile-${Date.now()}`,
    name: profile.name?.trim() || "Perfil",
    serverId: profile.serverId || "",
    createdAt: Number(profile.createdAt) || Date.now(),
    updatedAt: Number(profile.updatedAt) || Date.now()
  };
}
