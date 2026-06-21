import {
  CHECKLIST_ITEM_COUNT,
  MATRIX_DOUBLE_USE_CHARACTER_IDS,
  MATRIX_DOUBLE_USE_CHARACTER_NAMES,
  PRYDWEN_CHARACTER_BASE_URL,
  PRYDWEN_CHARACTER_SLUG_OVERRIDES,
  ROLES,
  STANDARD_FIVE_STAR_WEAPONS,
} from "./constants";
import type {
  Checklist,
  CharacterBadgeTone,
  DashboardSortKey,
  FourCostMain,
  RatingGrade,
  RatingValue,
  Role,
  TrackedCharacter,
  WeaponInventoryItem,
  WeaponRarityTone,
} from "./types";

const CHARACTER_RARITY_OVERRIDES: Record<
  string,
  {
    qualityId: number;
    badgeTone?: CharacterBadgeTone;
    animatedBadge?: boolean;
  }
> = {
  aalto: {
    qualityId: 6,
    animatedBadge: true,
  },
  roccia: {
    qualityId: 4,
  },
  brant: {
    qualityId: 2,
    badgeTone: "blue",
  },
};

const ECHO_CRIT_RATE_BASE = 0.375;
const ECHO_CRIT_DMG_BASE = 0.75;
const FOUR_COST_CRIT_RATE_BONUS = 0.22;
const FOUR_COST_CRIT_DMG_BONUS = 0.44;

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

export function getFourCostCritBases(fourCostMain: FourCostMain) {
  return {
    critRateBase:
      fourCostMain === "CR" || fourCostMain === "BOTH" ? FOUR_COST_CRIT_RATE_BONUS : 0,
    critDmgBase:
      fourCostMain === "CD" || fourCostMain === "BOTH" ? FOUR_COST_CRIT_DMG_BONUS : 0,
  };
}

export function getEchoCritPlaceholders(fourCostMain: FourCostMain) {
  const { critRateBase, critDmgBase } = getFourCostCritBases(fourCostMain);

  return {
    critRate: formatPercentInput(ECHO_CRIT_RATE_BASE + critRateBase),
    critDmg: formatPercentInput(ECHO_CRIT_DMG_BASE + critDmgBase),
  };
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

  const { critRateBase, critDmgBase } = getFourCostCritBases(character.fourCostMain);
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

  if (value >= 1.12) {
    return "S";
  }

  if (value >= 1.06) {
    return "S-";
  }

  if (value >= 1.02) {
    return "A+";
  }

  if (value >= 0.98) {
    return "A";
  }

  if (value >= 0.92) {
    return "A-";
  }

  if (value >= 0.86) {
    return "B+";
  }

  if (value >= 0.8) {
    return "B";
  }

  if (value >= 0.75) {
    return "B-";
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
    "S+": "rating-s-plus border border-weapon-gold-text text-app-bg",
    S: "border border-weapon-gold-strong bg-weapon-gold-text text-app-bg",
    "S-": "border border-weapon-gold-strong bg-weapon-gold-bg text-weapon-gold-text",
    "A+": "border border-status-good-border bg-status-good-bg text-status-good-text",
    A: "border border-status-good-border bg-status-good-bg text-status-good-text",
    "A-": "border border-status-good-border bg-status-good-bg text-status-good-text",
    "B+": "border border-weapon-blue-strong bg-weapon-blue-bg text-weapon-blue-text",
    B: "border border-weapon-blue-strong bg-weapon-blue-bg text-weapon-blue-text",
    "B-": "border border-weapon-blue-strong bg-weapon-blue-bg text-weapon-blue-text",
    C: "border border-status-warn-border bg-status-warn-bg text-status-warn-text",
    D: "border border-weapon-limited-strong bg-weapon-limited-bg text-weapon-limited-text",
    F: "border border-status-danger-border bg-status-danger-bg text-status-danger-text",
  };

  return classes[grade];
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

export function formatPercentInput(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return `${Math.round(value * 1000) / 10}`;
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

export function normalizeCharacterName(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase();
}

export function getCharacterRarityDisplay({
  name,
  qualityId,
}: {
  name?: string | null;
  qualityId?: number | null;
}) {
  const override = CHARACTER_RARITY_OVERRIDES[normalizeCharacterName(name)];

  return {
    qualityId: override?.qualityId ?? qualityId,
    badgeTone: override?.badgeTone,
    animatedBadge: override?.animatedBadge ?? false,
  };
}

export function getMatrixCharacterMaxUses(character: TrackedCharacter) {
  if (
    MATRIX_DOUBLE_USE_CHARACTER_IDS.has(character.characterId) ||
    MATRIX_DOUBLE_USE_CHARACTER_NAMES.has(character.characterName.toLowerCase())
  ) {
    return 2;
  }

  return 1;
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
      active:
        "border-2 border-role-dps-border bg-role-dps-active text-role-dps-text shadow-[0_0_0_1px_rgb(211_108_133_/_0.22),0_10px_24px_rgb(211_108_133_/_0.16)]",
      inactive:
        "border-app-border bg-app-surface text-app-muted-subtle opacity-75 hover:border-role-dps-border/80 hover:bg-role-dps-bg/35 hover:text-role-dps-text hover:opacity-100",
    },
    Hybrid: {
      active:
        "border-2 border-role-hybrid-border bg-role-hybrid-active text-role-hybrid-text shadow-[0_0_0_1px_rgb(126_160_232_/_0.22),0_10px_24px_rgb(126_160_232_/_0.16)]",
      inactive:
        "border-app-border bg-app-surface text-app-muted-subtle opacity-75 hover:border-role-hybrid-border/80 hover:bg-role-hybrid-bg/35 hover:text-role-hybrid-text hover:opacity-100",
    },
    Support: {
      active:
        "border-2 border-role-support-border bg-role-support-active text-role-support-text shadow-[0_0_0_1px_rgb(103_196_158_/_0.22),0_10px_24px_rgb(103_196_158_/_0.16)]",
      inactive:
        "border-app-border bg-app-surface text-app-muted-subtle opacity-75 hover:border-role-support-border/80 hover:bg-role-support-bg/35 hover:text-role-support-text hover:opacity-100",
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
      complete: "border-app-border/80 bg-role-dps-bg/72",
      incomplete: "border-role-dps-border/40 border-l-4 bg-role-dps-bg/18",
      status: complete
        ? "border border-role-dps-border bg-role-dps-active text-role-dps-text"
        : "border border-role-dps-border/40 bg-role-dps-bg/20 text-app-muted-subtle",
    },
    Hybrid: {
      complete: "border-app-border/80 bg-role-hybrid-bg/72",
      incomplete: "border-role-hybrid-border/40 border-l-4 bg-role-hybrid-bg/18",
      status: complete
        ? "border border-role-hybrid-border bg-role-hybrid-active text-role-hybrid-text"
        : "border border-role-hybrid-border/40 bg-role-hybrid-bg/20 text-app-muted-subtle",
    },
    Support: {
      complete: "border-app-border/80 bg-role-support-bg/72",
      incomplete: "border-role-support-border/40 border-l-4 bg-role-support-bg/18",
      status: complete
        ? "border border-role-support-border bg-role-support-active text-role-support-text"
        : "border border-role-support-border/40 bg-role-support-bg/20 text-app-muted-subtle",
    },
  };

  return {
    card: complete ? classes[role].complete : classes[role].incomplete,
    status: classes[role].status,
  };
}

export function roleSectionClasses(role: Role) {
  const classes: Record<Role, string> = {
    DPS: "border-app-border/80 bg-app-surface text-app-fg",
    Hybrid: "border-app-border/80 bg-app-surface text-app-fg",
    Support: "border-app-border/80 bg-app-surface text-app-fg",
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
      badge: "bg-weapon-blue-strong text-white",
      card: "border-weapon-blue-strong/70 bg-weapon-blue-bg/45",
      image: "border-weapon-blue-strong/70 bg-weapon-blue-bg",
      text: "text-weapon-blue-text",
    },
    purple: {
      badge: "bg-weapon-purple-strong text-white",
      card: "border-weapon-purple-strong/70 bg-weapon-purple-bg/45",
      image: "border-weapon-purple-strong/70 bg-weapon-purple-bg",
      text: "text-weapon-purple-text",
    },
    standardGold: {
      badge: "bg-weapon-gold-text text-app-bg",
      card: "border-weapon-gold-strong/70 bg-weapon-gold-bg/45",
      image: "border-weapon-gold-strong/70 bg-weapon-gold-bg",
      text: "text-weapon-gold-text",
    },
    limitedGold: {
      badge: "bg-weapon-limited-strong text-white",
      card: "border-weapon-limited-strong/70 bg-weapon-limited-bg/45",
      image: "border-weapon-limited-strong/70 bg-weapon-limited-bg",
      text: "text-weapon-limited-text",
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
