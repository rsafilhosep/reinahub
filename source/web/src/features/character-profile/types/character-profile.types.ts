export type CharacterPlatform = "Tibia Global" | "RubinOT" | "DeusOT" | "Taleon" | "OTServer" | "Outro";

export type CharacterVocation =
  | "None"
  | "Knight"
  | "Elite Knight"
  | "Paladin"
  | "Royal Paladin"
  | "Sorcerer"
  | "Master Sorcerer"
  | "Druid"
  | "Elder Druid"
  | "Monk"
  | "Exalted Monk"
  | "Custom";

export type CharacterProfile = {
  id: string;
  profileId?: string;
  name: string;
  platform: CharacterPlatform;
  world: string;
  linkedServerId: string;
  vocation: CharacterVocation;
  level: number;
  targetLevel: number;
  experience: number;
  residence: string;
  sex: string;
  accountStatus: string;
  lastLogin: string;
  loyaltyTitle: string;
  achievementPoints: number;
  notes: string;
  updatedAt: number;
};

export type CharacterExperienceInfo = {
  level: number;
  targetLevel: number;
  currentExperience: number;
  currentLevelExperience: number;
  nextLevelExperience: number;
  missingToNextLevel: number;
  targetLevelExperience: number;
  missingToTargetLevel: number;
  levelProgressPct: number;
};

export type CharacterLookupResult = {
  ok: boolean;
  source: string;
  message: string;
  character?: Partial<CharacterProfile>;
  blockedBy?: "cloudflare" | "source" | "tls";
  lookupUrl?: string;
};
