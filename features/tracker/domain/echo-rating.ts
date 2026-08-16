import {
  CHECKLIST_ITEM_COUNT,
  ECHO_CHECKLIST_ITEMS,
  ROLES,
} from "../constants";
import { parseEchoPrioritySubstats } from "../echo-estimates";
import { getCharacterSubstatPriority } from "../substat-priorities";
import {
  formatPercent,
  formatPercentInput,
  formatRatingValue,
} from "./input";
import type {
  Checklist,
  DashboardSortKey,
  EchoChecklistKey,
  EchoChecker,
  EchoCheckerEcho,
  EchoCheckerPlan,
  EchoCheckerSubstatId,
  EchoCheckerSubstatSlots,
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
const ECHO_CHECKER_SUBSTAT_BASE = -0.08;
const ECHO_CHECKER_ER_BOOST = 0.11;
const ECHO_CHECKER_UNPRIORITIZED_BOOST = 0.05;
const ECHO_CHECKER_UNPRIORITIZED_FALLBACK_BOOST = 0.06;
const ECHO_CHECKER_PRIORITY_MAX_BOOST = 0.12;
const ECHO_CHECKER_PRIORITY_MIN_BOOST = 0.05;
const ECHO_CHECKER_PRIORITY_ONLY_MAX_BOOST = 0.2;
const ECHO_CHECKER_PRIORITY_ONLY_MIN_BOOST = 0.12;
const ECHO_CHECKER_PRIORITY_TARGET_STAT_COUNT = 3;
const ECHO_CHECKER_PRIORITY_STAT_BASE = 0.17;
export const ECHO_CHECKER_MEDIAN_ER_ROLL = 10.25;
const EMPTY_ECHO_SUBSTAT_SLOTS: EchoCheckerSubstatSlots = [
  null,
  null,
  null,
  null,
  null,
];
const ECHO_CHECKER_SUBSTAT_IDS: EchoCheckerSubstatId[] = [
  "crit-rate",
  "crit-dmg",
  "atk-percent",
  "hp-percent",
  "def-percent",
  "energy-regen",
  "atk",
  "hp",
  "def",
  "basic",
  "heavy",
  "skill",
  "liberation",
];

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
          substatIds: [...EMPTY_ECHO_SUBSTAT_SLOTS],
        },
      }),
      {} as EchoChecker["echoes"],
    ),
    substats: [],
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

  if (critValue <= ECHO_CHECKER_DPS_TARGET_CRIT_VALUE) {
    return roundRating(critValue / ECHO_CHECKER_DPS_TARGET_CRIT_VALUE);
  }

  const excessCritValue = critValue - ECHO_CHECKER_DPS_TARGET_CRIT_VALUE;

  return roundRating(
    1 + excessCritValue / (ECHO_CHECKER_DPS_TARGET_CRIT_VALUE * 2),
  );
}

export function getEchoCheckerSubstatIds(
  echo: EchoCheckerEcho,
  priorityOnly = false,
): EchoCheckerSubstatSlots {
  const storedSubstats = priorityOnly
    ? echo.prioritySubstatIds
    : echo.substatIds;

  if (storedSubstats) {
    return Array.from(
      { length: 5 },
      (_, index) => storedSubstats[index] ?? null,
    );
  }

  return [...EMPTY_ECHO_SUBSTAT_SLOTS];
}

export function getEchoCheckerTargetStatCount(
  echo: EchoCheckerEcho,
  ignoreEnergyRegen = false,
  priorityOnly = false,
) {
  return getEchoCheckerSubstatIds(echo, priorityOnly).filter(
    (stat) => stat !== null && (!ignoreEnergyRegen || stat !== "energy-regen"),
  ).length;
}

export function getCharacterRedundantErRollCount(character: TrackedCharacter) {
  if (character.expectedEr <= 0) {
    return 0;
  }

  const excessEr = Math.max(0, character.actualEr - character.expectedEr);

  return Math.floor(excessEr / ECHO_CHECKER_MEDIAN_ER_ROLL);
}

export function isCharacterErOvercapped(character: TrackedCharacter) {
  return getCharacterRedundantErRollCount(character) > 0;
}

export function getEchoCheckerSubstatOptions(
  substatPriority: string,
  includeCrit = false,
): EchoCheckerSubstatId[] {
  const parsed = parseEchoPrioritySubstats(substatPriority);
  const priorityStats = parsed.priorityTiers
    .flat()
    .filter(
      (stat) => includeCrit || (stat !== "crit-rate" && stat !== "crit-dmg"),
    );

  return [...new Set(priorityStats)];
}

export function reconcileEchoCheckerSubstats(
  echo: EchoCheckerEcho,
  substatPriority: string,
  priorityOnly = false,
): EchoCheckerSubstatSlots {
  const allowedStats = new Set(
    getEchoCheckerSubstatOptions(substatPriority, priorityOnly),
  );
  const seenStats = new Set<EchoCheckerSubstatId>();

  return getEchoCheckerSubstatIds(echo, priorityOnly).map((stat) => {
    if (stat === null || !allowedStats.has(stat) || seenStats.has(stat)) {
      return null;
    }

    seenStats.add(stat);
    return stat;
  });
}

export function getEchoCheckerSubstatBoosts(
  substatPriority: string,
  ignoreEnergyRegen = false,
  includeCrit = false,
) {
  const parsed = parseEchoPrioritySubstats(substatPriority);
  const priorityTiers = parsed.priorityTiers
    .map((tier) =>
      tier.filter(
        (stat): stat is EchoCheckerSubstatId => {
          if (includeCrit) {
            return true;
          }

          return (
            stat !== "crit-rate" &&
            stat !== "crit-dmg" &&
            stat !== "energy-regen"
          );
        },
      ),
    )
    .filter((tier) => tier.length > 0);
  const hasPrioritizedSubstats = priorityTiers.length > 0;
  const unprioritizedBoost = hasPrioritizedSubstats
    ? ECHO_CHECKER_UNPRIORITIZED_BOOST
    : ECHO_CHECKER_UNPRIORITIZED_FALLBACK_BOOST;
  const boosts = new Map<EchoCheckerSubstatId, number>(
    ECHO_CHECKER_SUBSTAT_IDS.map((stat) => [stat, unprioritizedBoost]),
  );

  boosts.set(
    "energy-regen",
    ignoreEnergyRegen
      ? 0
      : includeCrit
        ? unprioritizedBoost
        : ECHO_CHECKER_ER_BOOST,
  );

  priorityTiers.forEach((tier, index) => {
    const maxBoost = includeCrit
      ? ECHO_CHECKER_PRIORITY_ONLY_MAX_BOOST
      : ECHO_CHECKER_PRIORITY_MAX_BOOST;
    const minBoost = includeCrit
      ? ECHO_CHECKER_PRIORITY_ONLY_MIN_BOOST
      : ECHO_CHECKER_PRIORITY_MIN_BOOST;
    const boost =
      priorityTiers.length === 1
        ? (maxBoost + minBoost) / 2
        : maxBoost -
          (index / (priorityTiers.length - 1)) *
            (maxBoost - minBoost);

    tier.forEach((stat) => {
      boosts.set(
        stat,
        stat === "energy-regen" && ignoreEnergyRegen ? 0 : roundRating(boost),
      );
    });
  });

  return boosts;
}

export function getEchoCheckerScore(
  echo: EchoCheckerEcho,
  substatPriority = "",
  ignoreEnergyRegen = false,
  priorityOnly = false,
) {
  const critValueRating = priorityOnly ? null : getEchoCheckerCritValueRating(echo);
  const prioritizedStats = new Set(
    getEchoCheckerSubstatOptions(substatPriority, priorityOnly),
  );
  const substatIds = getEchoCheckerSubstatIds(echo, priorityOnly).filter(
    (stat): stat is EchoCheckerSubstatId =>
      stat !== null && prioritizedStats.has(stat),
  );

  if (!priorityOnly && critValueRating === null && substatIds.length === 0) {
    return null;
  }

  const boosts = getEchoCheckerSubstatBoosts(
    substatPriority,
    ignoreEnergyRegen,
    priorityOnly,
  );
  const substatBonus = substatIds.reduce(
    (total, stat) => total + (boosts.get(stat) ?? ECHO_CHECKER_UNPRIORITIZED_BOOST),
    0,
  );

  if (priorityOnly) {
    const scoredSubstatIds = substatIds.filter(
      (stat) => !ignoreEnergyRegen || stat !== "energy-regen",
    );
    const priorityBonus = scoredSubstatIds.reduce(
      (total, stat) => total + (boosts.get(stat) ?? ECHO_CHECKER_UNPRIORITIZED_BOOST),
      0,
    );

    return roundRating(
      scoredSubstatIds.length * ECHO_CHECKER_PRIORITY_STAT_BASE + priorityBonus,
    );
  }

  return roundRating((critValueRating ?? 0) + ECHO_CHECKER_SUBSTAT_BASE + substatBonus);
}

export function getIgnoredErEchoKeys(character: TrackedCharacter) {
  const substatPriority = getCharacterSubstatPriority(character.characterId);

  if (substatPriority === null) {
    return new Set<EchoChecklistKey>();
  }

  const redundantRollCount = getCharacterRedundantErRollCount(character);

  if (redundantRollCount === 0) {
    return new Set<EchoChecklistKey>();
  }

  const erEchoes = ECHO_CHECKLIST_ITEMS.flatMap((item, index) => {
    const echo = getEchoCheckerEcho(character, item.key);

    if (
      !getEchoCheckerSubstatIds(echo, character.noCrit).includes(
        "energy-regen",
      )
    ) {
      return [];
    }

    return [
      {
        index,
        key: item.key,
        score:
          getEchoCheckerScore(
            echo,
            substatPriority,
            false,
            character.noCrit,
          ) ?? 0,
      },
    ];
  });

  erEchoes.sort((left, right) => left.score - right.score || left.index - right.index);

  return new Set(
    erEchoes.slice(0, redundantRollCount).map(({ key }) => key),
  );
}

function getEchoCheckerBuildScore(character: TrackedCharacter) {
  const substatPriority = getCharacterSubstatPriority(character.characterId);

  if (substatPriority === null) {
    return null;
  }

  const ignoredErEchoKeys = getIgnoredErEchoKeys(character);
  const echoScores = ECHO_CHECKLIST_ITEMS.map((item) =>
    getEchoCheckerScore(
      getEchoCheckerEcho(character, item.key),
      substatPriority,
      ignoredErEchoKeys.has(item.key),
      character.noCrit,
    ),
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
  ignoreEnergyRegen = false,
  priorityOnly = false,
) {
  const hasDoubleCrit = echo.critRate !== null && echo.critDmg !== null;
  const targetStatCount = getEchoCheckerTargetStatCount(
    echo,
    ignoreEnergyRegen,
    priorityOnly,
  );

  if (priorityOnly) {
    return targetStatCount >= ECHO_CHECKER_PRIORITY_TARGET_STAT_COUNT;
  }

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
  return character.echoChecker?.enabled === true;
}

export function getEchoCheckerEcho(
  character: TrackedCharacter,
  key: keyof Omit<Checklist, "skills">,
) {
  return (
    character.echoChecker?.echoes?.[key] ?? {
      critRate: null,
      critDmg: null,
      substatIds: [...EMPTY_ECHO_SUBSTAT_SLOTS],
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
  const hasSubstatPriority = getCharacterSubstatPriority(character.characterId) !== null;
  const ignoredErEchoKeys = getIgnoredErEchoKeys(character);
  const echoChecklist = ECHO_CHECKLIST_ITEMS.reduce(
    (checklist, item) => ({
      ...checklist,
      [item.key]: hasSubstatPriority
        ? isEchoCheckerEchoComplete(
            getEchoCheckerEcho(character, item.key),
            plan,
            ignoredErEchoKeys.has(item.key),
            character.noCrit,
          )
        : false,
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
  const substatPriorityAvailable =
    getCharacterSubstatPriority(character.characterId) !== null;

  if (character.noCrit) {
    const echoCheckerBuildScore = isEchoCheckerEnabled(character)
      ? getEchoCheckerBuildScore(character)
      : null;

    return {
      crRating: null,
      cdRating: null,
      critScore: null,
      buildScore: echoCheckerBuildScore,
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
    isEchoCheckerEnabled(character) &&
    substatPriorityAvailable &&
    echoCheckerBuildScore === null
      ? "Build Score needs at least one crit roll or selected substat for every echo."
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
