import { z } from "zod";

import type { EchoCheckerEcho, TrackedCharacter } from "../types";
import {
  createTrackerDocument,
  DEFAULT_TRACKER_PREFERENCES,
  type ParsedImportedTrackerData,
  type TrackerDocument,
} from "./documents";
import { trackerDocumentV4Schema } from "./schemas/legacy-v4";
import { trackerDocumentV5Schema } from "./schemas/legacy-v5";
import { upgradeTrackerDocument } from "./upgrades";

type LegacyData = z.infer<typeof trackerDocumentV5Schema>["data"];
type LegacyCharacter = LegacyData["characters"][number];
type LegacyEcho = NonNullable<LegacyCharacter["echoChecker"]>["echoes"]["fourCost"];

const legacyDataSchema = trackerDocumentV5Schema.shape.data;
// Unversioned exports also contained cached catalog fields that are no longer stored.
const legacyCharacterImportSchema = legacyDataSchema.shape.characters.element.loose();
const legacyObjectImportSchema = z.looseObject({
  characters: z.array(legacyCharacterImportSchema),
  weaponInventory: legacyDataSchema.shape.weaponInventory.optional(),
  matrixTeams: legacyDataSchema.shape.matrixTeams.optional(),
  preferences: legacyDataSchema.shape.preferences.nullish(),
});
const importEnvelopeSchema = z.object({
  format: z.unknown().optional(),
  schemaVersion: z.unknown().optional(),
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
  const converted: TrackedCharacter = {
    id: character.id,
    characterId: character.characterId,
    characterName: character.characterName,
    roles: [...new Set(character.roles)],
    weaponId: character.weaponId,
    weaponName: character.weaponName,
    fourCostMain: character.fourCostMain,
    noCrit: character.noCrit ?? false,
    critRate: character.critRate,
    critDmg: character.critDmg,
    checklist: character.checklist,
    expectedEr: character.expectedEr,
    actualEr: character.actualEr,
    notes: character.notes,
    createdAt: new Date(character.createdAt).toISOString(),
    updatedAt: new Date(character.updatedAt).toISOString(),
  };
  const checker = character.echoChecker;

  if (checker) {
    converted.echoChecker = {
      enabled: checker.enabled,
      plan: checker.plan,
      echoes: {
        fourCost: convertLegacyEcho(checker.echoes.fourCost),
        threeCostA: convertLegacyEcho(checker.echoes.threeCostA),
        threeCostB: convertLegacyEcho(checker.echoes.threeCostB),
        oneCostA: convertLegacyEcho(checker.echoes.oneCostA),
        oneCostB: convertLegacyEcho(checker.echoes.oneCostB),
      },
    };
  }

  return converted;
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
    preferences: data.preferences,
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
 * Reads unified exports and supported historical JSON formats.
 * @param text - The JSON file contents.
 * @returns Validated tracker data ready for the normal save path.
 */
export function parseImportedTrackerData(text: string): ParsedImportedTrackerData {
  const input: unknown = JSON.parse(text);
  const envelope = importEnvelopeSchema.safeParse(input);

  if (envelope.success && envelope.data.format !== undefined) {
    return upgradeTrackerDocument(input).data;
  }

  if (envelope.success && envelope.data.schemaVersion !== undefined) {
    if (envelope.data.schemaVersion === 5) {
      return convertLegacyV5Document(input).data;
    }

    if (envelope.data.schemaVersion === 4) {
      const legacy = trackerDocumentV4Schema.parse(input);

      return createTrackerDocument(convertLegacyData(legacy.data)).data;
    }

    throw new Error("This export uses an unsupported save version.");
  }

  const legacy = legacyObjectImportSchema.parse(
    Array.isArray(input) ? { characters: input } : input,
  );
  const document = createTrackerDocument(convertLegacyData({
    characters: legacy.characters,
    weaponInventory: legacy.weaponInventory ?? [],
    matrixTeams: legacy.matrixTeams ?? [{ id: "team-1", slots: [null, null, null] }],
    preferences: legacy.preferences ?? DEFAULT_TRACKER_PREFERENCES,
  }));

  return { ...document.data, preferences: legacy.preferences ?? null };
}
