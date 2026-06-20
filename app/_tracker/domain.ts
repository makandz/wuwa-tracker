import {
  CHECKLIST_ITEM_COUNT,
  PRYDWEN_CHARACTER_BASE_URL,
  PRYDWEN_CHARACTER_SLUG_OVERRIDES,
  ROLES,
  STANDARD_FIVE_STAR_WEAPONS,
} from "./constants";
import type {
  Checklist,
  DashboardSortKey,
  RatingGrade,
  RatingValue,
  Role,
  TrackedCharacter,
  WeaponInventoryItem,
  WeaponRarityTone,
} from "./types";

export function checklistTotal(checklist: Checklist) {
  return Object.values(checklist).filter(Boolean).length;
}

export function checklistProgress(character: TrackedCharacter) {
  return (checklistTotal(character.checklist) / CHECKLIST_ITEM_COUNT) * 100;
}

export function isComplete(character: TrackedCharacter) {
  return checklistTotal(character.checklist) === CHECKLIST_ITEM_COUNT;
}

export function getPrimaryRole(roles: Role[]) {
  return ROLES.find((role) => roles.includes(role)) ?? "DPS";
}

export function compareRatingValues(
  aValue: RatingValue,
  bValue: RatingValue,
  direction: "asc" | "desc",
) {
  if (aValue === null && bValue === null) {
    return 0;
  }

  if (aValue === null) {
    return 1;
  }

  if (bValue === null) {
    return -1;
  }

  return direction === "asc" ? aValue - bValue : bValue - aValue;
}

export function sortDashboardCharacters(
  characters: TrackedCharacter[],
  sortKey: DashboardSortKey,
) {
  return [...characters].sort((a, b) => {
    const aProgress = checklistProgress(a);
    const bProgress = checklistProgress(b);
    const aWeight = getRatings(a).weighted;
    const bWeight = getRatings(b).weighted;

    switch (sortKey) {
      case "name":
        return a.characterName.localeCompare(b.characterName);
      case "completionDesc":
        return (
          bProgress - aProgress ||
          compareRatingValues(aWeight, bWeight, "desc") ||
          a.characterName.localeCompare(b.characterName)
        );
      case "completionAsc":
        return (
          aProgress - bProgress ||
          compareRatingValues(aWeight, bWeight, "desc") ||
          a.characterName.localeCompare(b.characterName)
        );
      case "weightDesc":
        return (
          compareRatingValues(aWeight, bWeight, "desc") ||
          bProgress - aProgress ||
          a.characterName.localeCompare(b.characterName)
        );
      case "weightAsc":
        return (
          compareRatingValues(aWeight, bWeight, "asc") ||
          bProgress - aProgress ||
          a.characterName.localeCompare(b.characterName)
        );
      case "updated":
      default:
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
          a.characterName.localeCompare(b.characterName)
        );
    }
  });
}

export function roundRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

export function getRatings(character: TrackedCharacter) {
  if (character.noCrit) {
    return {
      crRating: null,
      cdRating: null,
      weighted: null,
      issue: "",
    };
  }

  const critRateBase =
    character.fourCostMain === "CR" || character.fourCostMain === "BOTH" ? 0.22 : 0;
  const critDmgBase =
    character.fourCostMain === "CD" || character.fourCostMain === "BOTH" ? 0.44 : 0;
  const crRating = (character.critRate - critRateBase) / (0.075 * 5);
  const cdRating = (character.critDmg - critDmgBase) / (0.15 * 5);
  const crRatingValid = crRating >= 0;
  const cdRatingValid = cdRating >= 0;
  const weighted = crRatingValid && cdRatingValid ? (crRating + cdRating) / 2 : null;
  const issues = [
    !crRatingValid ? `Crit Rate must be at least ${formatPercent(critRateBase)}.` : "",
    !cdRatingValid ? `Crit DMG must be at least ${formatPercent(critDmgBase)}.` : "",
  ].filter(Boolean);

  return {
    crRating: crRatingValid ? roundRating(crRating) : null,
    cdRating: cdRatingValid ? roundRating(cdRating) : null,
    weighted: weighted === null ? null : roundRating(weighted),
    issue: issues.join(" "),
  };
}

export function getRatingGrade(value: number): RatingGrade {
  if (value >= 1.2) {
    return "S+";
  }

  if (value >= 1.05) {
    return "S";
  }

  if (value >= 0.9) {
    return "A";
  }

  if (value >= 0.75) {
    return "B";
  }

  if (value >= 0.55) {
    return "C";
  }

  if (value >= 0.35) {
    return "D";
  }

  return "F";
}

export function ratingGradeClasses(grade: RatingGrade) {
  const classes: Record<RatingGrade, string> = {
    "S+": "rating-s-plus border border-yellow-100 bg-yellow-300 text-app-bg",
    S: "border border-yellow-200/90 bg-yellow-400 text-app-bg",
    A: "border border-emerald-400/70 bg-emerald-950/80 text-emerald-100",
    B: "border border-cyan-400/70 bg-cyan-950/80 text-cyan-100",
    C: "border border-amber-400/70 bg-amber-950/80 text-amber-100",
    D: "border border-orange-400/60 bg-orange-950/80 text-orange-100",
    F: "border border-rose-400/60 bg-rose-950/80 text-rose-100",
  };

  return classes[grade];
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

export function formatRatingValue(value: RatingValue) {
  return value === null ? "Check stats" : value.toFixed(2);
}

export function averageRatingValues(values: RatingValue[]) {
  const validValues = values.filter((value): value is number => value !== null);

  if (validValues.length === 0) {
    return null;
  }

  return roundRating(validValues.reduce((sum, value) => sum + value, 0) / validValues.length);
}

export function getRoleSummary(characters: TrackedCharacter[]) {
  const ratings = characters.map(getRatings);
  const critCharacterCount = characters.filter((character) => !character.noCrit).length;

  return {
    count: characters.length,
    critCharacterCount,
    averageCr: averageRatingValues(ratings.map((rating) => rating.crRating)),
    averageCd: averageRatingValues(ratings.map((rating) => rating.cdRating)),
    averageWeighted: averageRatingValues(ratings.map((rating) => rating.weighted)),
  };
}

export function formatRoleSummaryValue(value: RatingValue, critCharacterCount: number) {
  if (value !== null) {
    return formatRatingValue(value);
  }

  return critCharacterCount === 0 ? "No crit" : "Check";
}

export function getPrydwenCharacterUrl(characterName: string) {
  const overrideSlug = PRYDWEN_CHARACTER_SLUG_OVERRIDES[characterName];
  const slug =
    overrideSlug ??
    characterName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return `${PRYDWEN_CHARACTER_BASE_URL}/${slug}`;
}

export function sanitizeWholeNumberInput(value: string) {
  return value.replace(/\D/g, "");
}

export function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(",", ".");
  let sanitized = "";
  let hasDecimal = false;

  for (const character of normalized) {
    if (/\d/.test(character)) {
      sanitized += character;
      continue;
    }

    if (character === "." && !hasDecimal) {
      sanitized += character;
      hasDecimal = true;
    }
  }

  return sanitized;
}

export function parseWholeNumberInput(value: string) {
  const parsed = Number(sanitizeWholeNumberInput(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function parseDecimalInput(value: string) {
  const parsed = Number(sanitizeDecimalInput(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function formatDecimalInputValue(value: number) {
  if (!value) {
    return "";
  }

  return String(Math.round(value * 1000) / 1000);
}

export function roleButtonClasses(role: Role, active: boolean) {
  const palette: Record<Role, { active: string; inactive: string }> = {
    DPS: {
      active: "border-rose-500/80 bg-rose-900/80 text-rose-50",
      inactive: "border-rose-500/50 bg-rose-950/25 text-rose-200 hover:bg-rose-950/45",
    },
    Hybrid: {
      active: "border-indigo-500/80 bg-indigo-900/80 text-indigo-50",
      inactive: "border-indigo-500/50 bg-indigo-950/25 text-indigo-200 hover:bg-indigo-950/45",
    },
    Support: {
      active: "border-emerald-500/80 bg-emerald-900/80 text-emerald-50",
      inactive: "border-emerald-500/50 bg-emerald-950/25 text-emerald-200 hover:bg-emerald-950/45",
    },
  };

  return active ? palette[role].active : palette[role].inactive;
}

export function rolePillClasses(role: Role) {
  const classes: Record<Role, string> = {
    DPS: "border-rose-500/50 bg-rose-950/25 text-rose-200",
    Hybrid: "border-indigo-500/50 bg-indigo-950/25 text-indigo-200",
    Support: "border-emerald-500/50 bg-emerald-950/25 text-emerald-200",
  };

  return classes[role];
}

export function characterRoleToneClasses(role: Role, complete: boolean) {
  const classes: Record<Role, { complete: string; incomplete: string; status: string }> = {
    DPS: {
      complete: "border-rose-500/80 border-l-4 bg-rose-950/55",
      incomplete: "border-rose-400/55 border-l-4 bg-rose-950/20",
      status: complete
        ? "border border-rose-400/60 bg-rose-950/75 text-rose-100"
        : "border border-rose-300/45 bg-rose-950/30 text-rose-200",
    },
    Hybrid: {
      complete: "border-indigo-500/80 border-l-4 bg-indigo-950/55",
      incomplete: "border-indigo-400/55 border-l-4 bg-indigo-950/20",
      status: complete
        ? "border border-indigo-400/60 bg-indigo-950/75 text-indigo-100"
        : "border border-indigo-300/45 bg-indigo-950/30 text-indigo-200",
    },
    Support: {
      complete: "border-emerald-500/80 border-l-4 bg-emerald-950/55",
      incomplete: "border-emerald-400/55 border-l-4 bg-emerald-950/20",
      status: complete
        ? "border border-emerald-400/60 bg-emerald-950/75 text-emerald-100"
        : "border border-emerald-300/45 bg-emerald-950/30 text-emerald-200",
    },
  };

  return {
    card: complete ? classes[role].complete : classes[role].incomplete,
    status: classes[role].status,
  };
}

export function roleSectionClasses(role: Role) {
  const classes: Record<Role, string> = {
    DPS: "border-rose-500/50 bg-rose-950/20 text-rose-100",
    Hybrid: "border-indigo-500/50 bg-indigo-950/20 text-indigo-100",
    Support: "border-emerald-500/50 bg-emerald-950/20 text-emerald-100",
  };

  return classes[role];
}

export function getInventoryCount(
  inventory: WeaponInventoryItem[],
  weaponId: number | null,
) {
  if (!weaponId) {
    return 0;
  }

  return inventory.find((item) => item.weaponId === weaponId)?.count ?? 0;
}

export function getAssignmentCounts(characters: TrackedCharacter[]) {
  return characters.reduce<Record<number, number>>((counts, character) => {
    if (!character.weaponId) {
      return counts;
    }

    counts[character.weaponId] = (counts[character.weaponId] ?? 0) + 1;
    return counts;
  }, {});
}

export function getWeaponInventoryStatus({
  weaponId,
  inventory,
  assignmentCounts,
}: {
  weaponId: number | null;
  inventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
}) {
  if (!weaponId) {
    return null;
  }

  const owned = getInventoryCount(inventory, weaponId);
  const assigned = assignmentCounts[weaponId] ?? 0;

  if (owned === 0) {
    return "Not in inventory";
  }

  if (assigned > owned) {
    return "Shared";
  }

  return null;
}

export function normalizeWeaponName(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase();
}

export function getWeaponRarityTone({
  name,
  qualityId,
}: {
  name?: string | null;
  qualityId?: number | null;
}): WeaponRarityTone {
  if (qualityId === 3) {
    return "blue";
  }

  if (qualityId === 4) {
    return "purple";
  }

  if (qualityId === 5) {
    return STANDARD_FIVE_STAR_WEAPONS.has(normalizeWeaponName(name))
      ? "standardGold"
      : "limitedGold";
  }

  return "neutral";
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
      badge: "bg-sky-600 text-white",
      card: "border-sky-500/60 bg-sky-950/30",
      image: "border-sky-500/60 bg-sky-950/40",
      text: "text-sky-200",
    },
    purple: {
      badge: "bg-violet-600 text-white",
      card: "border-violet-500/60 bg-violet-950/30",
      image: "border-violet-500/60 bg-violet-950/40",
      text: "text-violet-200",
    },
    standardGold: {
      badge: "bg-yellow-300 text-app-bg",
      card: "border-yellow-500/60 bg-yellow-950/30",
      image: "border-yellow-500/60 bg-yellow-950/40",
      text: "text-yellow-200",
    },
    limitedGold: {
      badge: "bg-red-700 text-white",
      card: "border-red-500/60 bg-red-950/30",
      image: "border-red-500/60 bg-red-950/40",
      text: "text-red-200",
    },
    neutral: {
      badge: "bg-app-border text-white",
      card: "border-app-border/80 bg-app-surface/70",
      image: "border-app-border/80 bg-app-raised",
      text: "text-app-muted",
    },
  };

  return classes[tone];
}
