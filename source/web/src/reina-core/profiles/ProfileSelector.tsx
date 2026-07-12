"use client";

import { useEffect, useState } from "react";
import { Field, Panel } from "@/components/Panel";
import { loadServers } from "@/services/quote-service";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import { ProfileService, type ReinaProfile } from "./profile-service";

export function ProfileSelector({ onChange }: { onChange?: () => void }) {
  const [profiles, setProfiles] = useState<ReinaProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [servers, setServers] = useState<VaultServer[]>([]);
  const [newName, setNewName] = useState("");
  const [newServerId, setNewServerId] = useState("");

  useEffect(() => {
    sync();
    return ReinaEconomyService.subscribe(sync);
  }, []);

  function sync() {
    const nextProfiles = ProfileService.loadProfiles();
    const active = ProfileService.getActiveProfile();
    const nextServers = loadServers();
    setProfiles(nextProfiles);
    setActiveProfileId(active.id);
    setServers(nextServers);
    setNewServerId(active.serverId || nextServers[0]?.id || "");
    onChange?.();
  }

  function selectProfile(profileId: string) {
    ReinaActiveContextService.setActiveProfile(profileId);
    sync();
  }

  function createProfile() {
    const profile = ProfileService.createProfile(newName, newServerId);
    ReinaActiveContextService.setActiveProfile(profile.id);
    setNewName("");
    setActiveProfileId(profile.id);
    sync();
  }

  return (
    <Panel title="Perfil ativo" eyebrow="personagem - mundo - patrimonio">
      <div className="inputs-grid">
        <Field label="Usar perfil">
          <select value={activeProfileId} onChange={(event) => selectProfile(event.target.value)}>
            {profiles.map((profile) => {
              const server = servers.find((row) => row.id === profile.serverId);
              return (
                <option value={profile.id} key={profile.id}>
                  {profile.name}{server ? ` - ${ReinaEconomyService.getDisplayName(server)}` : ""}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label="Novo perfil">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex: RP Yubra, EK RubinOT..." />
        </Field>
        <Field label="Servidor do novo perfil">
          <select value={newServerId} onChange={(event) => setNewServerId(event.target.value)}>
            {servers.map((server) => (
              <option value={server.id} key={server.id}>{ReinaEconomyService.getDisplayName(server)}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="quick-row">
        <button className="quick-btn primary" type="button" onClick={createProfile} disabled={!newName.trim()}>
          Criar perfil
        </button>
      </div>
      <p className="note">
        Cada perfil tem seu proprio Stash. A cotacao continua vindo da Cotacao Central, mas o patrimonio fica separado por personagem/mundo.
      </p>
    </Panel>
  );
}
