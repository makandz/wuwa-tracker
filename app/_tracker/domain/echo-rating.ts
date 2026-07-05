import {
  CHECKLIST_ITEM_COUNT,
  ECHO_CHECKLIST_ITEMS,
  ECHO_RELEVANT_SUBSTAT_OPTIONS,
  ROLES,
} from "../constants";
import {
  formatPercent,
  formatPercentInput,
  formatRatingValue,
} from "./input";
import type {
  Checklist,
  DashboardSortKey,
  EchoChecker,
  EchoCheckerEcho,
  EchoCheckerPlan,
  FourCostMain,
  RatingGrade,
  RatingValue,
  Role,
  TrackedCharacter,
} from "../types";

const ECHO_CRIT_RATE_BASE = 0.375;
const ECHO_CRIT_DMG_BASE = 0.75;
const FOUR_COST_CRIT_RATE_BONUS = 0.22;
const FOUR_COST_CRIT_DMG_BONUS = 0.44;
const ECHO_CHECKER_DPS_TARGET_CRIT_VALUE = 30;
const ECHO_CHECKER_TARGET_STAT_BONUSES = [-0.08, 0, 0.06, 0.12] as const;

export function checklistTotal(checklist: Checklist) {
  return Object.values(checklist).filter(Boolean).length;
}

export function getDefaultEchoCheckerPlan(roles: Role[]): EchoCheckerPlan {
  return getPrimaryRole(roles) === "DPS" ? "DPS" : "HybridSupport";
}

export function createDefaultEchoChecker(roles: Role[]): EchoChecker {
  return {
    enabled: true,
    plan: getDefaultEchoCheckerPlan(roles),
    echoes: ECHO_CHECKLIST_ITEMS.reduce(
      (echoes, item) => ({
        ...echoes,
        [item.key]: {
          critRate: null,
          critDmg: null,
          hasRelevantStat: false,
          hasSecondRelevantStat: false,
          hasThirdRelevantStat: false,
        },
      }),
      {} as EchoChecker["echoes"],
    ),
    substats: ECHO_RELEVANT_SUBSTAT_OPTIONS.map((item) => ({ ...item })),
  };
}

export function getEchoCheckerCritValue(echo: EchoCheckerEcho) {
  if (echo.critRate === null && echo.critDmg === null) {
    return null;
  }

  return Math.round(((echo.critRate ?? 0) * 2 + (echo.critDmg ?? 0)) * 10) / 10;
}

export function getEchoCheckerCritValueRating(echo: EchoCheckerEcho) {
  const critValue = getEchoCheckerCritValue(echo);

  if (critValue === null) {
    return null;
  }

  return roundRating(critValue / ECHO_CHECKER_DPS_TARGET_CRIT_VALUE);
}

export function getEchoCheckerTargetStatCount(echo: EchoCheckerEcho) {
  return [
    echo.hasRelevantStat,
    echo.hasSecondRelevantStat,
    echo.hasThirdRelevantStat,
  ].filter(Boolean).length;
}

export function getEchoCheckerScore(echo: EchoCheckerEcho) {
  const critValueRating = getEchoCheckerCritValueRating(echo);
  const targetStatCount = getEchoCheckerTargetStatCount(echo);

  if (critValueRating === null && targetStatCount === 0) {
    return null;
  }

  const targetBonus = ECHO_CHECKER_TARGET_STAT_BONUSES[targetStatCount] ?? 0;

  return roundRating((critValueRating ?? 0) + targetBonus);
}

function getEchoCheckerBuildScore(character: TrackedCharacter) {
  const echoScores = ECHO_CHECKLIST_ITEMS.map((item) =>
    getEchoCheckerScore(getEchoCheckerEcho(character, item.key)),
  );
  const validEchoScores = echoScores.filter((value): value is number => value !== null);

  if (validEchoScores.length !== echoScores.length) {
    return null;
  }

  return averageRatingValues(validEchoScores);
}

export function isEchoCheckerEchoComplete(
  echo: EchoCheckerEcho,
  plan: EchoCheckerPlan,
) {
  const hasDoubleCrit = echo.critRate !== null && echo.critDmg !== null;
  const targetStatCount = getEchoCheckerTargetStatCount(echo);

  if (!hasDoubleCrit) {
    return false;
  }

  if (plan === "HybridSupport") {
    return targetStatCount >= 1;
  }

  const critValue = getEchoCheckerCritValue(echo);

  return (
    targetStatCount >= 2 ||
    (critValue !== null &&
      critValue >= ECHO_CHECKER_DPS_TARGET_CRIT_VALUE &&
      targetStatCount >= 1)
  );
}

export function isEchoCheckerEnabled(character: TrackedCharacter) {
  return !character.noCrit && character.echoChecker?.enabled === true;
}

export function getEchoCheckerEcho(
  character: TrackedCharacter,
  key: keyof Omit<Checklist, "skills">,
) {
  return (
    character.echoChecker?.echoes?.[key] ?? {
      critRate: null,
      critDmg: null,
      hasRelevantStat: false,
      hasSecondRelevantStat: false,
      hasThirdRelevantStat: false,
    }
  );
}

function roundEchoCritStat(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function getEchoCheckerCalculatedCritStats(character: TrackedCharacter) {
  const { critRateBase, critDmgBase } = getFourCostCritBases(character.fourCostMain);
  const totals = ECHO_CHECKLIST_ITEMS.reduce(
    (stats, item) => {
      const echo = getEchoCheckerEcho(character, item.key);

      return {
        critRate: stats.critRate + (echo.critRate ?? 0) / 100,
        critDmg: stats.critDmg + (echo.critDmg ?? 0) / 100,
      };
    },
    {
      critRate: critRateBase,
      critDmg: critDmgBase,
    },
  );

  return {
    critRate: roundEchoCritStat(totals.critRate),
    critDmg: roundEchoCritStat(totals.critDmg),
  };
}

export function getEffectiveEchoCritStats(character: TrackedCharacter) {
  if (isEchoCheckerEnabled(character)) {
    return getEchoCheckerCalculatedCritStats(character);
  }

  return {
    critRate: character.critRate,
    critDmg: character.critDmg,
  };
}

export function getEffectiveChecklist(character: TrackedCharacter): Checklist {
  if (!isEchoCheckerEnabled(character)) {
    return character.checklist;
  }

  const plan = character.echoChecker?.plan ?? getDefaultEchoCheckerPlan(character.roles);
  const echoChecklist = ECHO_CHECKLIST_ITEMS.reduce(
    (checklist, item) => ({
      ...checklist,
      [item.key]: isEchoCheckerEchoComplete(getEchoCheckerEcho(character, item.key), plan),
    }),
    {} as Pick<Checklist, keyof Omit<Checklist, "skills">>,
  );

  return {
    ...character.checklist,
    ...echoChecklist,
  };
}

export function checklistProgress(character: TrackedCharacter) {
  return (checklistTotal(getEffectiveChecklist(character)) / CHECKLIST_ITEM_COUNT) * 100;
}

export function isComplete(character: TrackedCharacter) {
  return checklistTotal(getEffectiveChecklist(character)) === CHECKLIST_ITEM_COUNT;
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
    const aBuildScore = getRatings(a).buildScore;
    const bBuildScore = getRatings(b).buildScore;

    switch (sortKey) {
      case "name":
        return a.characterName.localeCompare(b.characterName);
      case "completionDesc":
        return (
          bProgress - aProgress ||
          compareRatingValues(aBuildScore, bBuildScore, "desc") ||
          a.characterName.localeCompare(b.characterName)
        );
      case "completionAsc":
        return (
          aProgress - bProgress ||
          compareRatingValues(aBuildScore, bBuildScore, "asc") ||
          a.characterName.localeCompare(b.characterName)
        );
      case "weightDesc":
        return (
          compareRatingValues(aBuildScore, bBuildScore, "desc") ||
          bProgress - aProgress ||
          a.characterName.localeCompare(b.characterName)
        );
      case "weightAsc":
        return (
          compareRatingValues(aBuildScore, bBuildScore, "asc") ||
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
      critScore: null,
      buildScore: null,
      issue: "",
    };
  }

  const { critRateBase, critDmgBase } = getFourCostCritBases(character.fourCostMain);
  const { critRate, critDmg } = getEffectiveEchoCritStats(character);
  const crRating = (critRate - critRateBase) / (0.075 * 5);
  const cdRating = (critDmg - critDmgBase) / (0.15 * 5);
  const crRatingValid = crRating >= 0;
  const cdRatingValid = cdRating >= 0;
  const critScore = crRatingValid && cdRatingValid ? (crRating + cdRating) / 2 : null;
  const echoCheckerBuildScore = isEchoCheckerEnabled(character)
    ? getEchoCheckerBuildScore(character)
    : null;
  const buildScore = isEchoCheckerEnabled(character) ? echoCheckerBuildScore : critScore;
  const issues = [
    !crRatingValid ? `Crit Rate must be at least ${formatPercent(critRateBase)}.` : "",
    !cdRatingValid ? `Crit DMG must be at least ${formatPercent(critDmgBase)}.` : "",
    isEchoCheckerEnabled(character) && echoCheckerBuildScore === null
      ? "Build Score needs at least one crit roll or target stat for every echo."
      : "",
  ].filter(Boolean);

  return {
    crRating: crRatingValid ? roundRating(crRating) : null,
    cdRating: cdRatingValid ? roundRating(cdRating) : null,
    critScore: critScore === null ? null : roundRating(critScore),
    buildScore: buildScore === null ? null : roundRating(buildScore),
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
    averageBuildScore: averageRatingValues(ratings.map((rating) => rating.buildScore)),
  };
}

export function formatRoleSummaryValue(value: RatingValue, critCharacterCount: number) {
  if (value !== null) {
    return formatRatingValue(value);
  }

  return critCharacterCount === 0 ? "No crit" : "Check";
}
