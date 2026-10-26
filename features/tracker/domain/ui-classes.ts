import { normalizeCharacterName } from "./route-display";
import type { ErStatus, RatingGrade, WeaponRarityTone } from "../types";

export function ratingGradeClasses(grade: RatingGrade) {
  const classes: Record<RatingGrade, string> = {
    "S+": "border border-weapon-gold-text bg-weapon-gold-text text-app-bg",
    S: "border border-weapon-gold-strong/80 bg-weapon-gold-bg text-weapon-gold-text",
    "S-": "border border-weapon-gold-strong/80 bg-weapon-gold-bg/70 text-weapon-gold-text/70",
    "A+": "border border-weapon-purple-strong/80 bg-weapon-purple-strong text-app-bg",
    A: "border border-weapon-purple-strong/80 bg-weapon-purple-bg text-weapon-purple-text",
    "A-": "border border-weapon-purple-strong/70 bg-weapon-purple-bg/55 text-weapon-purple-text",
    "B+": "border border-weapon-blue-strong/80 bg-weapon-blue-strong text-app-bg",
    B: "border border-weapon-blue-strong/80 bg-weapon-blue-bg text-weapon-blue-text",
    "B-": "border border-weapon-blue-strong/70 bg-weapon-blue-bg/55 text-weapon-blue-text",
    C: "border border-status-good-border bg-status-good-bg text-status-good-text",
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

export const ER_STATUS_CLASSES = {
  unknown: "text-app-muted-dim",
  below: "text-status-warn-text",
  met: "text-status-good-text",
} satisfies Record<ErStatus, string>;
