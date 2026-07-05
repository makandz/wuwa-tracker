import { normalizeCharacterName } from "./route-display";
import type { RatingGrade, Role, WeaponRarityTone } from "../types";

export function ratingGradeClasses(grade: RatingGrade) {
  const classes: Record<RatingGrade, string> = {
    "S+": "rating-s-plus border border-weapon-gold-strong text-app-bg",
    S: "border border-weapon-gold-strong bg-weapon-gold-bg text-weapon-gold-text",
    "S-": "border border-weapon-gold-strong/80 bg-weapon-gold-bg/70 text-weapon-gold-text",
    "A+": "border border-status-good-border/80 bg-status-good-bg text-status-good-text",
    A: "border border-status-good-border/80 bg-status-good-bg text-status-good-text",
    "A-": "border border-status-good-border/70 bg-status-good-bg/75 text-status-good-text",
    "B+": "border border-app-border bg-app-raised text-app-fg",
    B: "border border-app-border bg-app-raised text-app-fg",
    "B-": "border border-app-border bg-app-surface text-app-muted",
    C: "border border-status-warn-border/80 bg-status-warn-bg text-status-warn-text",
    D: "border border-weapon-limited-strong/80 bg-weapon-limited-bg text-weapon-limited-text",
    F: "border border-status-danger-border/80 bg-status-danger-bg text-status-danger-text",
  };

  return classes[grade];
}

export function characterElementBorderClasses(elementName: string | null | undefined) {
  const classes: Record<string, string> = {
    fusion: "border-element-fusion",
    glacio: "border-element-glacio",
    aero: "border-element-aero",
    electro: "border-element-electro",
    spectro: "border-element-spectro",
    havoc: "border-element-havoc",
  };

  return classes[normalizeCharacterName(elementName)] ?? "border-app-border/80";
}

export function roleButtonClasses(role: Role, active: boolean) {
  const palette: Record<Role, { active: string; inactive: string }> = {
    DPS: {
      active:
        "border-role-dps-border bg-role-dps-active text-role-dps-text",
      inactive:
        "border-app-border bg-app-surface text-app-muted-subtle hover:border-role-dps-border/80 hover:bg-role-dps-bg/35 hover:text-role-dps-text",
    },
    Hybrid: {
      active:
        "border-role-hybrid-border bg-role-hybrid-active text-role-hybrid-text",
      inactive:
        "border-app-border bg-app-surface text-app-muted-subtle hover:border-role-hybrid-border/80 hover:bg-role-hybrid-bg/35 hover:text-role-hybrid-text",
    },
    Support: {
      active:
        "border-role-support-border bg-role-support-active text-role-support-text",
      inactive:
        "border-app-border bg-app-surface text-app-muted-subtle hover:border-role-support-border/80 hover:bg-role-support-bg/35 hover:text-role-support-text",
    },
  };

  return active ? palette[role].active : palette[role].inactive;
}

export function rolePillClasses(role: Role) {
  const classes: Record<Role, string> = {
    DPS: "border-role-dps-border/65 bg-role-dps-bg/45 text-role-dps-text",
    Hybrid: "border-role-hybrid-border/65 bg-role-hybrid-bg/45 text-role-hybrid-text",
    Support: "border-role-support-border/65 bg-role-support-bg/45 text-role-support-text",
  };

  return classes[role];
}

export function characterRoleToneClasses(role: Role, complete: boolean) {
  const classes: Record<Role, { complete: string; incomplete: string; status: string }> = {
    DPS: {
      complete: "border-app-border/80 border-l-role-dps-border bg-app-surface",
      incomplete: "border-app-border/80 bg-app-surface",
      status: complete
        ? "border border-role-dps-border/70 bg-role-dps-bg/60 text-role-dps-text"
        : "border border-app-border bg-app-raised text-app-muted-subtle",
    },
    Hybrid: {
      complete: "border-app-border/80 border-l-role-hybrid-border bg-app-surface",
      incomplete: "border-app-border/80 bg-app-surface",
      status: complete
        ? "border border-role-hybrid-border/70 bg-role-hybrid-bg/60 text-role-hybrid-text"
        : "border border-app-border bg-app-raised text-app-muted-subtle",
    },
    Support: {
      complete: "border-app-border/80 border-l-role-support-border bg-app-surface",
      incomplete: "border-app-border/80 bg-app-surface",
      status: complete
        ? "border border-role-support-border/70 bg-role-support-bg/60 text-role-support-text"
        : "border border-app-border bg-app-raised text-app-muted-subtle",
    },
  };

  return {
    card: `border-l-2 ${complete ? classes[role].complete : classes[role].incomplete}`,
    status: classes[role].status,
  };
}

export function roleSectionClasses(role: Role) {
  const classes: Record<Role, string> = {
    DPS: "border-app-border/80 text-app-fg",
    Hybrid: "border-app-border/80 text-app-fg",
    Support: "border-app-border/80 text-app-fg",
  };

  return classes[role];
}

export function getWeaponToneClasses(tone: WeaponRarityTone) {
  const classes: Record<
    WeaponRarityTone,
    {
      badge: string;
      card: string;
      image: string;
      text: string;
    }
  > = {
    blue: {
      badge: "border border-weapon-blue-strong/70 bg-weapon-blue-bg text-weapon-blue-text",
      card: "border-app-border/80 bg-app-surface",
      image: "border-app-border/80 bg-weapon-blue-bg/55",
      text: "text-weapon-blue-text",
    },
    purple: {
      badge: "border border-weapon-purple-strong/70 bg-weapon-purple-bg text-weapon-purple-text",
      card: "border-app-border/80 bg-app-surface",
      image: "border-app-border/80 bg-weapon-purple-bg/55",
      text: "text-weapon-purple-text",
    },
    standardGold: {
      badge: "border border-weapon-gold-strong/80 bg-weapon-gold-bg text-weapon-gold-text",
      card: "border-app-border/80 bg-app-surface",
      image: "border-app-border/80 bg-weapon-gold-bg/60",
      text: "text-weapon-gold-text",
    },
    limitedGold: {
      badge: "border border-weapon-limited-strong/80 bg-weapon-limited-bg text-weapon-limited-text",
      card: "border-app-border/80 bg-app-surface",
      image: "border-app-border/80 bg-weapon-limited-bg/60",
      text: "text-weapon-limited-text",
    },
    neutral: {
      badge: "border border-app-border bg-app-raised text-app-muted",
      card: "border-app-border/80 bg-app-surface",
      image: "border-app-border/80 bg-app-raised",
      text: "text-app-muted",
    },
  };

  return classes[tone];
}
