import { ECHO_CHECKLIST_ITEMS } from "../constants";
import { parseEchoPrioritySubstats } from "../echo-estimates";
import { getCharacterSubstatPriority } from "../substat-priorities";
import type {
  Checklist,
  EchoChecklistKey,
  EchoCheckerEcho,
  EchoCheckerSubstatId,
  EchoCheckerSubstatSlots,
  EchoScoringPreset,
  EchoSet,
  ErStatus,
  RatingGrade,
  RatingValue,
  TrackedCharacter,
} from "../types";

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

/**
 * Calculates crit value from one echo’s factual rolls.
 * @param echo - The echo measurements.
 * @returns The crit value, or null when neither crit roll is entered.
 */
export function getEchoCheckerCritValue(echo: EchoCheckerEcho) {
  if (echo.critRate === null && echo.critDmg === null) {
    return null;
  }

  return Math.round(((echo.critRate ?? 0) * 2 + (echo.critDmg ?? 0)) * 10) / 10;
}

/**
 * Applies the existing soft cap to an echo’s crit value.
 * @param echo - The echo measurements.
 * @returns Its crit rating, or null without crit measurements.
 */
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

/**
 * Reads the selections belonging to the requested scoring mode.
 * @param echo - The validated echo data.
 * @param priorityOnly - Whether to read priority-only selections.
 * @returns The five saved substat slots.
 */
export function getEchoCheckerSubstatIds(
  echo: EchoCheckerEcho,
  priorityOnly = false,
): EchoCheckerSubstatSlots {
  return priorityOnly ? echo.prioritySubstatIds : echo.substatIds;
}

/**
 * Counts selected relevant stats, excluding redundant ER when requested.
 * @param echo - The echo measurements.
 * @param ignoreEnergyRegen - Whether its ER roll is redundant.
 * @param priorityOnly - Whether priority-only scoring applies.
 * @returns The number of contributing selections.
 */
export function getEchoCheckerTargetStatCount(
  echo: EchoCheckerEcho,
  ignoreEnergyRegen = false,
  priorityOnly = false,
) {
  return getEchoCheckerSubstatIds(echo, priorityOnly).filter(
    (stat) => stat !== null && (!ignoreEnergyRegen || stat !== "energy-regen"),
  ).length;
}

/**
 * Builds the selectable stats from curated priority text.
 * @param substatPriority - The curated priority expression.
 * @param includeCrit - Whether crit stats are selectable as priority stats.
 * @returns The ordered unique selectable stats.
 */
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

/**
 * Derives valid selections without changing stored measurements.
 * @param echo - The saved echo.
 * @param substatPriority - The current curated priorities.
 * @param priorityOnly - Whether priority-only selections apply.
 * @returns Five slots with unavailable or duplicate selections cleared.
 */
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

/**
 * Assigns the existing stat boosts for the chosen scoring mode.
 * @param substatPriority - The curated priority expression.
 * @param ignoreEnergyRegen - Whether ER contributes no boost.
 * @param includeCrit - Whether priority-only weighting applies.
 * @returns The boost associated with each stat.
 */
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

/**
 * Scores one echo using the existing crit or priority-stat formula.
 * @param echo - The saved echo measurements.
 * @param substatPriority - The curated priorities.
 * @param ignoreEnergyRegen - Whether its ER roll is redundant.
 * @param priorityOnly - Whether to score priority stats instead of crit values.
 * @returns The echo score, or null when crit scoring lacks all measurements.
 */
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

/**
 * Checks an echo against its set’s chosen completion preset.
 * @param echo - The evaluated echo measurements.
 * @param scoring - The selected scoring preset.
 * @param ignoreEnergyRegen - Whether its ER roll is redundant.
 * @returns Whether the preset’s completion requirements are met.
 */
export function isEchoCheckerEchoComplete(
  echo: EchoCheckerEcho,
  scoring: EchoScoringPreset,
  ignoreEnergyRegen = false,
) {
  const priorityOnly = scoring === "priority-stats";
  const hasDoubleCrit = echo.critRate !== null && echo.critDmg !== null;
  const targetStatCount = getEchoCheckerTargetStatCount(
    echo,
    ignoreEnergyRegen,
    priorityOnly,
  );

  if (priorityOnly) {
    return targetStatCount >= ECHO_CHECKER_PRIORITY_TARGET_STAT_COUNT;
  }

  if (scoring === "standard-crit") {
    const hasSingleCrit = echo.critRate !== null || echo.critDmg !== null;

    return (hasDoubleCrit && targetStatCount >= 1) || (hasSingleCrit && targetStatCount >= 4);
  }

  if (!hasDoubleCrit) {
    return false;
  }

  const critValue = getEchoCheckerCritValue(echo);

  return (
    targetStatCount >= 2 ||
    (critValue !== null &&
      critValue >= ECHO_CHECKER_DPS_TARGET_CRIT_VALUE &&
      targetStatCount >= 1)
  );
}

/**
 * Rounds finite scores for display and comparisons.
 * @param value - The calculated score.
 * @returns The score rounded to two decimal places.
 */
export function roundRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

/**
 * Maps a score to the existing letter-grade thresholds.
 * @param value - The numeric score.
 * @returns Its letter grade.
 */
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

/**
 * Averages available echo scores.
 * @param values - The scores to combine.
 * @returns The rounded average, or null when no scores are available.
 */
export function averageRatingValues(values: RatingValue[]) {
  const validValues = values.filter((value): value is number => value !== null);

  if (validValues.length === 0) {
    return null;
  }

  return roundRating(validValues.reduce((sum, value) => sum + value, 0) / validValues.length);
}


/**
 * Describes whether a set's actual ER meets the shared character target.
 * @param actualEr - This set's ER, or null when unknown.
 * @param expectedEr - The shared target, or null when unspecified.
 * @returns A neutral, below-target, or met-target status.
 */
export function getErStatus(actualEr: number | null, expectedEr: number | null): ErStatus {
  if (actualEr === null || expectedEr === null || expectedEr <= 0) {
    return "unknown";
  }

  return actualEr >= expectedEr ? "met" : "below";
}

/**
 * Counts full excess ER rolls using only this set's actual ER.
 * @param expectedEr - The shared target.
 * @param actualEr - This set's ER.
 * @returns The number of redundant median ER rolls.
 */
export function getRedundantErRollCount(expectedEr: number | null, actualEr: number | null) {
  if (expectedEr === null || expectedEr <= 0 || actualEr === null) {
    return 0;
  }

  return Math.floor(Math.max(0, actualEr - expectedEr) / ECHO_CHECKER_MEDIAN_ER_ROLL);
}

/**
 * Finds the lowest-scoring ER rolls made redundant within one set.
 * @param characterId - The character whose curated priorities apply.
 * @param expectedEr - The shared character target.
 * @param echoSet - The set to evaluate.
 * @returns Echo positions whose ER roll contributes no score or completion.
 */
export function getIgnoredErEchoKeys(
  characterId: number,
  expectedEr: number | null,
  echoSet: EchoSet,
) {
  const priority = getCharacterSubstatPriority(characterId);
  const redundant = getRedundantErRollCount(expectedEr, echoSet.actualEr);

  if (priority === null || redundant === 0) {
    return new Set<EchoChecklistKey>();
  }

  const priorityOnly = echoSet.scoring === "priority-stats";
  const erEchoes = ECHO_CHECKLIST_ITEMS.flatMap(({ key }, index) => {
    const echo = echoSet.echoes[key];

    if (!getEchoCheckerSubstatIds(echo, priorityOnly).includes("energy-regen")) {
      return [];
    }

    return [{ key, index, score: getEchoCheckerScore(echo, priority, false, priorityOnly) ?? 0 }];
  });

  erEchoes.sort((left, right) => left.score - right.score || left.index - right.index);

  return new Set(erEchoes.slice(0, redundant).map(({ key }) => key));
}

/**
 * Calculates a detailed set's average score without mixing it with other sets.
 * @param characterId - The character whose curated priorities apply.
 * @param expectedEr - The shared ER target.
 * @param echoSet - The set to evaluate.
 * @returns Its score, or null for checklist mode or insufficient information.
 */
export function getEchoSetScore(
  characterId: number,
  expectedEr: number | null,
  echoSet: EchoSet,
): RatingValue {
  const priority = getCharacterSubstatPriority(characterId);

  if (echoSet.mode === "checklist" || priority === null) {
    return null;
  }

  const ignored = getIgnoredErEchoKeys(characterId, expectedEr, echoSet);
  const scores = ECHO_CHECKLIST_ITEMS.map(({ key }) => getEchoCheckerScore(
    echoSet.echoes[key],
    priority,
    ignored.has(key),
    echoSet.scoring === "priority-stats",
  ));

  if (scores.some((score) => score === null)) {
    return null;
  }

  return averageRatingValues(scores);
}

/**
 * Reads manual completion or derives it from one set's detailed measurements.
 * @param characterId - The character whose curated priorities apply.
 * @param expectedEr - The shared ER target.
 * @param echoSet - The set to evaluate.
 * @returns Completion flags for its five echo positions.
 */
export function getEchoSetChecklist(
  characterId: number,
  expectedEr: number | null,
  echoSet: EchoSet,
): Checklist {
  if (echoSet.mode === "checklist") {
    return echoSet.checklist;
  }

  const priority = getCharacterSubstatPriority(characterId);
  const priorityOnly = echoSet.scoring === "priority-stats";
  const ignored = getIgnoredErEchoKeys(characterId, expectedEr, echoSet);
  const result: Checklist = {
    fourCost: false, threeCostA: false, threeCostB: false, oneCostA: false, oneCostB: false,
  };

  if (priority === null) {
    return result;
  }

  for (const { key } of ECHO_CHECKLIST_ITEMS) {
    const echo = echoSet.echoes[key];
    const selections = reconcileEchoCheckerSubstats(echo, priority, priorityOnly);
    const evaluated = {
      ...echo,
      [priorityOnly ? "prioritySubstatIds" : "substatIds"]: selections,
    };
    result[key] = isEchoCheckerEchoComplete(evaluated, echoSet.scoring, ignored.has(key));
  }

  return result;
}

/**
 * Counts completed echo positions.
 * @param checklist - The set's effective completion flags.
 * @returns The number of completed positions.
 */
export function checklistTotal(checklist: Checklist) {
  return Object.values(checklist).filter(Boolean).length;
}

/**
 * Checks shared skills and every echo set for character completion.
 * @param character - The tracked character.
 * @returns Whether skills and all five positions in every set are complete.
 */
export function isComplete(character: TrackedCharacter) {
  return character.skillsDone && character.echoSets.every((set) =>
    checklistTotal(getEchoSetChecklist(character.characterId, character.expectedEr, set)) === 5,
  );
}
