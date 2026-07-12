import { AppShell } from "@/components/AppShell";
import { CharacterProfilePage } from "@/source/web/src/features/character-profile/components";

export default function CharactersRoute() {
  return (
    <AppShell current="characters" mark="CH" subtitle="Characters - perfil do jogador">
      <CharacterProfilePage />
    </AppShell>
  );
}
