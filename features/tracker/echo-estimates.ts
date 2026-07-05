export type EchoSubstatId =
  | "crit-rate"
  | "crit-dmg"
  | "atk"
  | "hp"
  | "def"
  | "atk-percent"
  | "hp-percent"
  | "def-percent"
  | "energy-regen"
  | "basic"
  | "heavy"
  | "skill"
  | "liberation";

export type MakanEstimateRowId = "dps" | "hybrid-support";

export type ParsedEchoSubstats = {
  otherTargetStats: EchoSubstatId[];
  usedFallback: boolean;
};

export type MakanEstimateRow = {
  id: MakanEstimateRowId;
  label: string;
  chance: number;
  expectedEchoes: number | null;
  expectedGrossTuners: number | null;
  expectedNetTuners: number | null;
  emphasized: boolean;
};

export type MakanEchoEstimate = {
  parsed: ParsedEchoSubstats;
  passFiveChance: number;
  passTwentyChance: number;
  tunersPerAttempt: number;
  rows: MakanEstimateRow[];
};

const CRIT_RATE_STAT: EchoSubstatId = "crit-rate";
const CRIT_DMG_STAT: EchoSubstatId = "crit-dmg";
const FALLBACK_OTHER_TARGET_STATS: EchoSubstatId[] = [
  "atk",
  "atk-percent",
  "energy-regen",
];
const ECHO_SUBSTATS: EchoSubstatId[] = [
  "crit-rate",
  "crit-dmg",
  "atk",
  "hp",
  "def",
  "atk-percent",
  "hp-percent",
  "def-percent",
  "energy-regen",
  "basic",
  "heavy",
  "skill",
  "liberation",
];
const ECHO_TUNERS_PER_SUBSTAT = 10;
const ECHO_TUNER_REFUND_RATE = 0.3;
const ECHO_CRIT_VALUE_TARGET = 30;
const CRIT_ROLL_WEIGHTS = [
  0.2258,
  0.2205,
  0.2397,
  0.0902,
  0.0724,
  0.0772,
  0.0374,
  0.0369,
];
const CRIT_RATE_ROLL_VALUES = [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5];
const CRIT_DMG_ROLL_VALUES = [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21];

export const ECHO_SUBSTAT_LABELS: Record<EchoSubstatId, string> = {
  "crit-rate": "Crit Rate",
  "crit-dmg": "Crit DMG",
  atk: "ATK",
  hp: "HP",
  def: "DEF",
  "atk-percent": "ATK%",
  "hp-percent": "HP%",
  "def-percent": "DEF%",
  "energy-regen": "Energy Regen",
  basic: "Basic DMG%",
  heavy: "Heavy DMG%",
  skill: "Skill DMG%",
  liberation: "Liberation DMG%",
};

const ECHO_SUBSTAT_ALIASES: {
  id: EchoSubstatId;
  aliases: RegExp[];
}[] = [
  {
    id: "crit-rate",
    aliases: [
      /\bcrit(?:ical)?\.?\s*rate\b/,
      /\bc\s*rate\b/,
      /\bcrate\b/,
      /\bcr\b/,
    ],
  },
  {
    id: "crit-dmg",
    aliases: [
      /\bcrit(?:ical)?\.?\s*(?:dmg|damage)\b/,
      /\bc\s*dmg\b/,
      /\bcdmg\b/,
      /\bcd\b/,
    ],
  },
  {
    id: "atk-percent",
    aliases: [/\b(?:atk|attack)(?:\s*%|\s+(?:percent|pct)\b)/],
  },
  {
    id: "hp-percent",
    aliases: [/\b(?:hp|health)(?:\s*%|\s+(?:percent|pct)\b)/],
  },
  {
    id: "def-percent",
    aliases: [/\b(?:def|defense)(?:\s*%|\s+(?:percent|pct)\b)/],
  },
  {
    id: "energy-regen",
    aliases: [
      /\benergy\s*(?:regen|regeneration|recharge)\b/,
      /\ber\b/,
    ],
  },
  {
    id: "liberation",
    aliases: [
      /\bresonance\s*liberation\b/,
      /\bliberation\s*(?:dmg|damage)?\b/,
      /\blib\s*(?:dmg|damage)?\b/,
      /\bultimate?\b/,
      /\bult\b/,
    ],
  },
  {
    id: "skill",
    aliases: [
      /\bresonance\s*skill\b/,
      /\bskill\s*(?:dmg|damage)?\b/,
    ],
  },
  {
    id: "basic",
    aliases: [
      /\bbasic\s*attack\b/,
      /\bbasic\s*(?:dmg|damage)?\b/,
    ],
  },
  {
    id: "heavy",
    aliases: [
      /\bheavy\s*attack\b/,
      /\bheavy\s*(?:dmg|damage)?\b/,
    ],
  },
  {
    id: "atk",
    aliases: [/\b(?:atk|attack)\b(?!\s*(?:%|percent|pct))/],
  },
  {
    id: "hp",
    aliases: [/\b(?:hp|health)\b(?!\s*(?:%|percent|pct))/],
  },
  {
    id: "def",
    aliases: [/\b(?:def|defense)\b(?!\s*(?:%|percent|pct))/],
  },
];

function normalizePriorityText(value: string) {
  return value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[>=≤≥=,/|+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseEchoPrioritySubstats(value: string): ParsedEchoSubstats {
  const normalizedValue = normalizePriorityText(value);
  const parsedStats = ECHO_SUBSTAT_ALIASES.reduce<EchoSubstatId[]>((stats, item) => {
    if (item.aliases.some((alias) => alias.test(normalizedValue))) {
      return [...stats, item.id];
    }

    return stats;
  }, []);
  const otherTargetStats = parsedStats.filter(
    (stat) => stat !== CRIT_RATE_STAT && stat !== CRIT_DMG_STAT,
  );

  if (otherTargetStats.length === 0) {
    return {
      otherTargetStats: FALLBACK_OTHER_TARGET_STATS,
      usedFallback: true,
    };
  }

  return {
    otherTargetStats,
    usedFallback: false,
  };
}

function hasCrit(stats: EchoSubstatId[]) {
  return stats.includes(CRIT_RATE_STAT) || stats.includes(CRIT_DMG_STAT);
}

function hasDoubleCrit(stats: EchoSubstatId[]) {
  return stats.includes(CRIT_RATE_STAT) && stats.includes(CRIT_DMG_STAT);
}

function countCritStats(stats: EchoSubstatId[]) {
  return [CRIT_RATE_STAT, CRIT_DMG_STAT].filter((stat) => stats.includes(stat)).length;
}

function countOtherTargetStats(stats: EchoSubstatId[], otherTargetStats: Set<EchoSubstatId>) {
  return stats.filter((stat) => otherTargetStats.has(stat)).length;
}

function getCritValuePassChance() {
  return CRIT_RATE_ROLL_VALUES.reduce((chance, critRate, critRateIndex) => {
    return (
      chance +
      CRIT_DMG_ROLL_VALUES.reduce((critDmgChance, critDmg, critDmgIndex) => {
        if (critRate * 2 + critDmg < ECHO_CRIT_VALUE_TARGET) {
          return critDmgChance;
        }

        return critDmgChance + CRIT_ROLL_WEIGHTS[critRateIndex] * CRIT_ROLL_WEIGHTS[critDmgIndex];
      }, 0)
    );
  }, 0);
}

function getDpsSuccessChanceForSequence(
  stats: EchoSubstatId[],
  otherTargetStats: Set<EchoSubstatId>,
  critValuePassChance: number,
) {
  if (!hasDoubleCrit(stats)) {
    return 0;
  }

  const otherTargetStatCount = countOtherTargetStats(stats, otherTargetStats);

  if (otherTargetStatCount >= 2) {
    return 1;
  }

  if (otherTargetStatCount >= 1) {
    return critValuePassChance;
  }

  return 0;
}

function getHybridSupportSuccessChanceForSequence(
  stats: EchoSubstatId[],
  otherTargetStats: Set<EchoSubstatId>,
) {
  if (!hasDoubleCrit(stats)) {
    return 0;
  }

  const otherTargetStatCount = countOtherTargetStats(stats, otherTargetStats);

  return otherTargetStatCount >= 1 ? 1 : 0;
}

function createEstimateRow({
  chance,
  emphasized,
  id,
  label,
  passFiveChance,
  passTwentyChance,
  tunersPerAttempt,
}: {
  chance: number;
  emphasized: boolean;
  id: MakanEstimateRowId;
  label: string;
  passFiveChance: number;
  passTwentyChance: number;
  tunersPerAttempt: number;
}): MakanEstimateRow {
  const failFiveNetTuners = ECHO_TUNERS_PER_SUBSTAT * (1 - ECHO_TUNER_REFUND_RATE);
  const failTwentyNetTuners = ECHO_TUNERS_PER_SUBSTAT * 4 * (1 - ECHO_TUNER_REFUND_RATE);
  const failFinalNetTuners = ECHO_TUNERS_PER_SUBSTAT * 5 * (1 - ECHO_TUNER_REFUND_RATE);
  const successTuners = ECHO_TUNERS_PER_SUBSTAT * 5;
  const netTunersPerAttempt =
    (1 - passFiveChance) * failFiveNetTuners +
    (passFiveChance - passTwentyChance) * failTwentyNetTuners +
    (passTwentyChance - chance) * failFinalNetTuners +
    chance * successTuners;

  return {
    id,
    label,
    chance,
    expectedEchoes: chance === 0 ? null : 1 / chance,
    expectedGrossTuners: chance === 0 ? null : tunersPerAttempt / chance,
    expectedNetTuners: chance === 0 ? null : netTunersPerAttempt / chance,
    emphasized,
  };
}

export function getMakanEchoEstimate({
  substatPriority,
}: {
  substatPriority: string;
}): MakanEchoEstimate {
  const parsed = parseEchoPrioritySubstats(substatPriority);
  const otherTargetStats = new Set(parsed.otherTargetStats);
  const critValuePassChance = getCritValuePassChance();
  const pathChance =
    1 /
    (ECHO_SUBSTATS.length *
      (ECHO_SUBSTATS.length - 1) *
      (ECHO_SUBSTATS.length - 2) *
      (ECHO_SUBSTATS.length - 3) *
      (ECHO_SUBSTATS.length - 4));
  let passFiveChance = 0;
  let passTwentyChance = 0;
  let dpsChance = 0;
  let hybridSupportChance = 0;

  for (const firstStat of ECHO_SUBSTATS) {
    for (const secondStat of ECHO_SUBSTATS) {
      if (secondStat === firstStat) continue;
      for (const thirdStat of ECHO_SUBSTATS) {
        if (thirdStat === firstStat || thirdStat === secondStat) continue;
        for (const fourthStat of ECHO_SUBSTATS) {
          if (
            fourthStat === firstStat ||
            fourthStat === secondStat ||
            fourthStat === thirdStat
          ) {
            continue;
          }

          for (const fifthStat of ECHO_SUBSTATS) {
            if (
              fifthStat === firstStat ||
              fifthStat === secondStat ||
              fifthStat === thirdStat ||
              fifthStat === fourthStat
            ) {
              continue;
            }

            const firstFiveStats = [firstStat];
            const firstTwentyStats = [firstStat, secondStat, thirdStat, fourthStat];
            const allStats = [
              firstStat,
              secondStat,
              thirdStat,
              fourthStat,
              fifthStat,
            ];
            const passesFive =
              hasCrit(firstFiveStats) ||
              countOtherTargetStats(firstFiveStats, otherTargetStats) > 0;

            if (!passesFive) {
              continue;
            }

            passFiveChance += pathChance;

            const firstTwentyCritCount = countCritStats(firstTwentyStats);
            const passesTwenty =
              firstTwentyCritCount === 2 ||
              (firstTwentyCritCount === 1 &&
                countOtherTargetStats(firstTwentyStats, otherTargetStats) > 0);

            if (!passesTwenty) {
              continue;
            }

            passTwentyChance += pathChance;

            const sequenceDpsChance = getDpsSuccessChanceForSequence(
              allStats,
              otherTargetStats,
              critValuePassChance,
            );
            dpsChance += pathChance * sequenceDpsChance;
            hybridSupportChance +=
              pathChance *
              getHybridSupportSuccessChanceForSequence(allStats, otherTargetStats);
          }
        }
      }
    }
  }

  const tunersPerAttempt =
    ECHO_TUNERS_PER_SUBSTAT +
    passFiveChance * ECHO_TUNERS_PER_SUBSTAT * 3 +
    passTwentyChance * ECHO_TUNERS_PER_SUBSTAT;

  return {
    parsed,
    passFiveChance,
    passTwentyChance,
    tunersPerAttempt,
    rows: [
      createEstimateRow({
        chance: dpsChance,
        emphasized: false,
        id: "dps",
        label: "DPS (2Crit + 1T + 30CV or 2Crit + 2T)",
        passFiveChance,
        passTwentyChance,
        tunersPerAttempt,
      }),
      createEstimateRow({
        chance: hybridSupportChance,
        emphasized: false,
        id: "hybrid-support",
        label: "Hybrid/Support (2Crit + 1T)",
        passFiveChance,
        passTwentyChance,
        tunersPerAttempt,
      }),
    ],
  };
}
