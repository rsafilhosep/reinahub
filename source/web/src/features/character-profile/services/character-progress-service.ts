import { GoalService } from "@/source/web/src/features/goals/services";
import experienceTable from "../generated/experience-table.json";
import type { CharacterExperienceInfo, CharacterProfile } from "../types/character-profile.types";

export const CharacterProgressService = {
  getExperienceForLevel(level: number) {
    const safeLevel = Math.max(1, Math.trunc(Number(level) || 1));
    const row = experienceTable.levels.find((entry) => entry.level === safeLevel);
    if (row) return row.experience;
    return Math.floor((50 * safeLevel ** 3 - 150 * safeLevel ** 2 + 400 * safeLevel) / 3);
  },

  getExperienceInfo(character: CharacterProfile): CharacterExperienceInfo {
    const level = Math.max(1, Math.trunc(Number(character.level) || 1));
    const targetLevel = Math.max(level + 1, Math.trunc(Number(character.targetLevel) || level + 1));
    const currentLevelExperience = this.getExperienceForLevel(level);
    const nextLevelExperience = this.getExperienceForLevel(level + 1);
    const targetLevelExperience = this.getExperienceForLevel(targetLevel);
    const currentExperience = Math.max(Number(character.experience) || 0, currentLevelExperience);
    const levelGoal = GoalService.calculateLevelGoal({ currentLevel: level, targetLevel, currentExperience });
    const nextLevelGoal = GoalService.calculateLevelGoal({ currentLevel: level, targetLevel: level + 1, currentExperience });

    return {
      level,
      targetLevel,
      currentExperience,
      currentLevelExperience,
      nextLevelExperience,
      missingToNextLevel: Math.max(0, nextLevelExperience - currentExperience),
      targetLevelExperience,
      missingToTargetLevel: levelGoal.missingXp,
      levelProgressPct: nextLevelGoal.progressPct
    };
  },

  calculateProgressPlan(missingXp: number, xpPerHour: number, hoursPerDay: number, sessionHours: number) {
    const safeMissingXp = Math.max(0, Number(missingXp) || 0);
    const safeXpPerHour = Math.max(0, Number(xpPerHour) || 0);
    if (!safeMissingXp || !safeXpPerHour) return null;

    const safeHoursPerDay = Math.max(0.1, Number(hoursPerDay) || 1);
    const safeSessionHours = Math.max(0.1, Number(sessionHours) || 1);
    const hoursNeeded = safeMissingXp / safeXpPerHour;

    return {
      missingXp: safeMissingXp,
      xpPerHour: safeXpPerHour,
      hoursNeeded,
      daysNeeded: Math.ceil(hoursNeeded / safeHoursPerDay),
      sessionsNeeded: Math.ceil(hoursNeeded / safeSessionHours)
    };
  },

  calculateMonsterKillPlan(missingToNextLevel: number, missingToTargetLevel: number, xpPerKill: number) {
    const safeXpPerKill = Math.max(0, Number(xpPerKill) || 0);
    if (safeXpPerKill <= 0) return null;

    return {
      xpPerKill: safeXpPerKill,
      killsToNextLevel: GoalService.calculateKillsNeeded(missingToNextLevel, safeXpPerKill) ?? 0,
      killsToTargetLevel: GoalService.calculateKillsNeeded(missingToTargetLevel, safeXpPerKill) ?? 0
    };
  }
};
