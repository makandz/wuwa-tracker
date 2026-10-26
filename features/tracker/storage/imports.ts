import { z } from "zod";

import { createEchoSet } from "../echo-sets";
import type { EchoCheckerEcho, EchoScoringPreset, TrackedCharacter } from "../types";
import {
  createTrackerDocument,
  type ParsedImportedTrackerData,
  type TrackerDocument,
} from "./documents";
import { trackerDocumentV5Schema } from "./schemas/legacy-v5";
import { upgradeTrackerDocument } from "./upgrades";

type LegacyData = z.infer<typeof trackerDocumentV5Schema>["data"];
type LegacyCharacter = LegacyData["characters"][number];
type LegacyEcho = NonNullable<LegacyCharacter["echoChecker"]>["echoes"]["fourCost"];

const importEnvelopeSchema = z.object({
  format: z.string().optional(),
  schemaVersion: z.number().int().positive(),
});

/** Converts historical three-slot selections and retired Other entries explicitly. */
function convertLegacySlots(
  slots: LegacyEcho["substatIds"],
): EchoCheckerEcho["substatIds"] {
  const seen = new Set<string>();

  return Array.from({ length: 5 }, (_, index) => {
    const stat = slots?.[index];

    if (stat === undefined || stat === null || stat === "other" || seen.has(stat)) {
      return null;
    }

    seen.add(stat);
    return stat;
  });
}

/** Preserves factual echo measurements and both selection modes. */
function convertLegacyEcho(echo: LegacyEcho): EchoCheckerEcho {
  return {
    critRate: echo.critRate,
    critDmg: echo.critDmg,
    substatIds: convertLegacySlots(echo.substatIds),
    prioritySubstatIds: convertLegacySlots(echo.prioritySubstatIds),
  };
}

/** Maps a validated legacy character without carrying obsolete fields forward. */
function convertLegacyCharacter(character: LegacyCharacter): TrackedCharacter {
  const echoSet = createEchoSet(`${character.id}-default`);
  const checker = character.echoChecker;
  let scoring: EchoScoringPreset = "standard-crit";

  if (character.noCrit) {
    scoring = "priority-stats";
  } else if (checker?.plan === "DPS" || (!checker && character.roles.includes("DPS"))) {
    scoring = "strict-crit";
  }

  echoSet.scoring = scoring;
  echoSet.mode = checker?.enabled ? "detailed" : "checklist";
  echoSet.actualEr = character.actualEr > 0 ? character.actualEr : null;
  echoSet.checklist = {
    fourCost: character.checklist.fourCost,
    threeCostA: character.checklist.threeCostA,
    threeCostB: character.checklist.threeCostB,
    oneCostA: character.checklist.oneCostA,
    oneCostB: character.checklist.oneCostB,
  };

  if (checker) {
    echoSet.echoes = {
      fourCost: convertLegacyEcho(checker.echoes.fourCost),
      threeCostA: convertLegacyEcho(checker.echoes.threeCostA),
      threeCostB: convertLegacyEcho(checker.echoes.threeCostB),
      oneCostA: convertLegacyEcho(checker.echoes.oneCostA),
      oneCostB: convertLegacyEcho(checker.echoes.oneCostB),
    };
  }

  return {
    id: character.id,
    characterId: character.characterId,
    characterName: character.characterName,
    weaponId: character.weaponId,
    weaponName: character.weaponName,
    skillsDone: character.checklist.skills,
    expectedEr: character.expectedEr > 0 ? character.expectedEr : null,
    echoSets: [echoSet],
    notes: character.notes,
    createdAt: new Date(character.createdAt).toISOString(),
    updatedAt: new Date(character.updatedAt).toISOString(),
  };
}

/** Converts a validated legacy payload into the canonical unified shape. */
function convertLegacyData(data: LegacyData) {
  const characters = data.characters.map(convertLegacyCharacter);
  const characterIds = new Set(characters.map((character) => character.id));

  return {
    characters,
    weaponInventory: data.weaponInventory,
    matrixTeams: data.matrixTeams.map((team) => ({
      id: team.id,
      // Previous tracker loads cleared references to deleted characters too.
      slots: team.slots.map((id) =>
        id !== null && characterIds.has(id) ? id : null,
      ) as typeof team.slots,
    })),
    preferences: {
      welcomeSeen: data.preferences.welcomeSeen,
      backupNoticeAcknowledgedAt: data.preferences.backupNoticeAcknowledgedAt,
    },
  };
}

/**
 * Converts the existing browser's v5 save without changing legacy storage.
 * @param input - The untrusted legacy document.
 * @returns A validated unified v1 document.
 */
export function convertLegacyV5Document(input: unknown): TrackerDocument {
  const legacy = trackerDocumentV5Schema.parse(input);

  return createTrackerDocument({
    ...convertLegacyData(legacy.data),
    revision: legacy.revision,
    savedAt: new Date(legacy.savedAt).toISOString(),
  });
}

/**
 * Reads complete unified v1 or legacy v5 exports.
 * @param text - The JSON file contents.
 * @returns Validated tracker data ready for the normal save path.
 */
export function parseImportedTrackerData(text: string): ParsedImportedTrackerData {
  const input: unknown = JSON.parse(text);
  const envelope = importEnvelopeSchema.parse(input);

  if (envelope.format === "unified") {
    return upgradeTrackerDocument(input).data;
  }

  if (envelope.format === undefined && envelope.schemaVersion === 5) {
    return convertLegacyV5Document(input).data;
  }

  throw new Error("This export uses an unsupported save format or version.");
}
