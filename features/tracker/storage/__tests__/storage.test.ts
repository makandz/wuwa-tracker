import { beforeEach, describe, expect, test } from "vitest";

import {
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  STORAGE_KEY,
  TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
  TRACKER_DOCUMENT_STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
} from "../keys";
import {
  DEFAULT_TRACKER_PREFERENCES,
  TrackerStorageRevisionConflictError,
  createTrackerDocumentV5,
  exportTrackerData,
  hasNewerTrackerDocumentRevision,
  parseImportedTrackerData,
  writeStoredTrackerDocumentWithRevisionGuard,
} from "../index";
import { normalizePreferences } from "../documents";
import { commitStorageMigration } from "../migrations/plans";
import { inspectTrackerStorage } from "../inspection";
import { readStoredTrackerDocument } from "../recovery";
import { cleanMatrixTeamsForCharacters } from "../../tracker-data";
import type {
  EchoChecker,
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../../types";

class MemoryStorage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

const localStorage = new MemoryStorage();
let exportedBlob: Blob | null = null;
let clickedDownloadName = "";

function installBrowserStorageMocks() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorage,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tagName: string) => {
        expect(tagName).toBe("a");

        return {
          href: "",
          download: "",
          click() {
            clickedDownloadName = this.download;
          },
        };
      },
    },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (blob: Blob) => {
      exportedBlob = blob;

      return "blob:test-export";
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: () => undefined,
  });
}

function makeCharacter(
  overrides: Partial<TrackedCharacter> = {},
): TrackedCharacter {
  return {
    id: "char-1",
    characterId: 101,
    characterName: "Rover",
    roles: ["DPS"],
    weaponId: 201,
    weaponName: "Emerald of Genesis",
    fourCostMain: "CR",
    noCrit: false,
    critRate: 70,
    critDmg: 240,
    checklist: {
      skills: true,
      fourCost: false,
      threeCostA: true,
      threeCostB: false,
      oneCostA: true,
      oneCostB: false,
    },
    substatPriority: "Crit Rate > Crit DMG",
    expectedEr: 120,
    actualEr: 118,
    notes: "main team",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeLegacyFlatCharacter(overrides: Record<string, unknown> = {}) {
  return {
    ...makeCharacter(),
    characterIcon: "/rover.png",
    qualityId: 5,
    elementName: "Spectro",
    weaponTypeId: 1,
    weaponTypeName: "Sword",
    weaponQualityId: 5,
    ...overrides,
  };
}

function makeEchoChecker(): EchoChecker {
  return {
    enabled: true,
    plan: "DPS",
    echoes: {
      fourCost: {
        critRate: null,
        critDmg: null,
        hasRelevantStat: true,
        hasSecondRelevantStat: true,
        hasThirdRelevantStat: false,
      },
      threeCostA: {
        critRate: null,
        critDmg: null,
        hasRelevantStat: true,
        hasSecondRelevantStat: false,
        hasThirdRelevantStat: false,
      },
      threeCostB: {
        critRate: null,
        critDmg: null,
        hasRelevantStat: true,
        hasSecondRelevantStat: false,
        hasThirdRelevantStat: false,
      },
      oneCostA: {
        critRate: null,
        critDmg: null,
        hasRelevantStat: true,
        hasSecondRelevantStat: false,
        hasThirdRelevantStat: false,
      },
      oneCostB: {
        critRate: null,
        critDmg: null,
        hasRelevantStat: true,
        hasSecondRelevantStat: false,
        hasThirdRelevantStat: false,
      },
    },
    substatPriority: "",
    substats: [],
  };
}

function removeThirdRelevantStats(echoChecker: EchoChecker) {
  return {
    ...echoChecker,
    echoes: Object.fromEntries(
      Object.entries(echoChecker.echoes).map(([key, echo]) => {
        const rest: Record<string, unknown> = { ...echo };

        delete rest.hasThirdRelevantStat;
        return [key, rest];
      }),
    ),
  };
}

function makeMatrixTeams(): MatrixTeam[] {
  return [
    {
      id: "team-1",
      slots: ["char-1", "char-2", null],
    },
  ];
}

function makeWeaponInventory(): WeaponInventoryItem[] {
  return [{ weaponId: 201, count: 2 }];
}

beforeEach(() => {
  installBrowserStorageMocks();
  localStorage.clear();
  exportedBlob = null;
  clickedDownloadName = "";
});

describe("tracker storage", () => {
  test("migrates legacy split-key storage into the v5 document", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeLegacyFlatCharacter()]));
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(makeWeaponInventory()));
    localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(makeMatrixTeams()));
    localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, "true");
    localStorage.setItem(DASHBOARD_SORT_STORAGE_KEY, "name");
    localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, "grid");
    localStorage.setItem(BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY, "12345");

    const inspection = inspectTrackerStorage();

    expect(inspection.state).toBe("migration-required");

    if (inspection.state !== "migration-required") {
      throw new Error("Expected migration plan.");
    }

    expect(inspection.migrationPlan.source.version).toBe("legacy-v3");
    expect(inspection.migrationPlan.source.payloadVersion).toBe(4);
    expect(inspection.migrationPlan.steps.map((step) => step.id)).toEqual([
      "v4-to-v5",
    ]);
    expect(
      (inspection.migrationPlan.source.payload as { schemaVersion?: unknown })
        .schemaVersion,
    ).toBe(4);
    expect(
      (
        inspection.migrationPlan.source.payload as {
          data?: { characters?: Array<Record<string, unknown>> };
        }
      ).data?.characters?.[0],
    ).toMatchObject({
      characterIcon: "/rover.png",
      qualityId: 5,
      elementName: "Spectro",
      weaponTypeId: 1,
      weaponTypeName: "Sword",
      weaponQualityId: 5,
    });

    const document = commitStorageMigration(inspection.migrationPlan);
    const storedDocument = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY) ?? "null",
    );

    expect(document.schemaVersion).toBe(5);
    expect(document.data.characters[0]?.characterName).toBe("Rover");
    expect(document.data.weaponInventory).toEqual(makeWeaponInventory());
    expect(document.data.matrixTeams).toEqual(makeMatrixTeams());
    expect(document.data.preferences).toEqual({
      welcomeSeen: true,
      dashboardSortKey: "name",
      dashboardViewMode: "grid",
      backupNoticeAcknowledgedAt: 12345,
    });
    expect(storedDocument.data.characters[0].id).toBe("char-1");
    expect(storedDocument.data.characters[0].characterIcon).toBeUndefined();
    expect(storedDocument.data.characters[0].weaponQualityId).toBeUndefined();
  });

  test("migrates v4 documents into the reduced v5 character shape", () => {
    const characters = [
      makeLegacyFlatCharacter({ id: "char-1", characterId: 101, characterName: "Rover" }),
      makeLegacyFlatCharacter({ id: "char-2", characterId: 102, characterName: "Verina" }),
      makeLegacyFlatCharacter({ id: "char-3", characterId: 103, characterName: "Encore" }),
      makeLegacyFlatCharacter({ id: "char-4", characterId: 104, characterName: "Sanhua" }),
      makeLegacyFlatCharacter({ id: "char-5", characterId: 105, characterName: "Yangyang" }),
      makeLegacyFlatCharacter({ id: "char-6", characterId: 106, characterName: "Baizhi" }),
    ];

    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 4,
        app: "wuwa-tracker",
        savedAt: "2026-01-03T00:00:00.000Z",
        revision: 4,
        data: {
          characters,
          weaponInventory: makeWeaponInventory(),
          matrixTeams: makeMatrixTeams(),
          preferences: DEFAULT_TRACKER_PREFERENCES,
        },
      }),
    );

    const inspection = inspectTrackerStorage();

    expect(inspection.state).toBe("migration-required");

    if (inspection.state !== "migration-required") {
      throw new Error("Expected v4 migration plan.");
    }

    expect(inspection.migrationPlan.source.preview.items).toEqual([
      "Rover",
      "Verina",
      "Encore",
      "Sanhua",
      "Yangyang",
      "Baizhi",
    ]);
    expect(
      (
        inspection.migrationPlan.source.payload as {
          data?: { characters?: Array<Record<string, unknown>> };
        }
      ).data?.characters?.[0],
    ).toMatchObject({
      characterIcon: "/rover.png",
      qualityId: 5,
      elementName: "Spectro",
      weaponTypeId: 1,
      weaponTypeName: "Sword",
      weaponQualityId: 5,
    });

    const document = commitStorageMigration(inspection.migrationPlan);
    const storedCharacter = document.data.characters[0];

    expect(document.schemaVersion).toBe(5);
    expect(storedCharacter?.characterId).toBe(101);
    expect(storedCharacter?.characterName).toBe("Rover");
    expect(storedCharacter?.weaponId).toBe(201);
    expect(storedCharacter?.weaponName).toBe("Emerald of Genesis");
    expect("characterIcon" in (storedCharacter ?? {})).toBe(false);
    expect("weaponQualityId" in (storedCharacter ?? {})).toBe(false);
  });

  test("migrates v4 documents with older echo checker fields", () => {
    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 4,
        app: "wuwa-tracker",
        savedAt: "2026-01-03T00:00:00.000Z",
        revision: 4,
        data: {
          characters: [
            makeLegacyFlatCharacter({
              echoChecker: removeThirdRelevantStats(makeEchoChecker()),
            }),
            makeLegacyFlatCharacter({
              id: "char-2",
              characterId: 102,
              characterName: "Verina",
              weaponQualityId: null,
            }),
          ],
          weaponInventory: makeWeaponInventory(),
          matrixTeams: makeMatrixTeams(),
          preferences: DEFAULT_TRACKER_PREFERENCES,
        },
      }),
    );

    const inspection = inspectTrackerStorage();

    expect(inspection.state).toBe("migration-required");

    if (inspection.state !== "migration-required") {
      throw new Error("Expected v4 migration plan.");
    }

    const document = commitStorageMigration(inspection.migrationPlan);

    expect(document.schemaVersion).toBe(5);
    expect(
      document.data.characters[0]?.echoChecker?.echoes.fourCost
        .substatIds,
    ).toEqual(["other", "other", null]);
    expect(
      document.data.characters[0]?.echoChecker?.echoes.oneCostB
        .substatIds,
    ).toEqual(["other", null, null]);
    expect("weaponQualityId" in (document.data.characters[1] ?? {})).toBe(
      false,
    );
  });

  test("offers legacy split migration when current storage is corrupt", () => {
    localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, "{corrupt");
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeLegacyFlatCharacter()]));
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(makeWeaponInventory()));
    localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(makeMatrixTeams()));

    const inspection = inspectTrackerStorage();

    expect(inspection.state).toBe("migration-required");

    if (inspection.state !== "migration-required") {
      throw new Error("Expected legacy migration plan.");
    }

    expect(inspection.status.message).toBe(
      "Current tracker storage could not be recovered, but older tracker data can be migrated.",
    );
    expect(inspection.migrationPlan.source.id).toBe("legacy-split-storage");
    expect(inspection.migrationPlan.steps.map((step) => step.id)).toEqual([
      "v4-to-v5",
    ]);
  });

  test("reports unsupported versioned documents without parsing them as current", () => {
    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 99,
        app: "wuwa-tracker",
        data: {},
      }),
    );

    const inspection = inspectTrackerStorage();

    expect(inspection.state).toBe("error");
    expect(inspection.status.message).toBe(
      "Tracker storage uses unsupported save format v99.",
    );
  });

  test("imports old array exports as character-only data", () => {
    const imported = parseImportedTrackerData(
      JSON.stringify([makeLegacyFlatCharacter()]),
    );

    expect(imported.characters).toHaveLength(1);
    expect(imported.characters[0]?.characterName).toBe("Rover");
    expect("characterIcon" in (imported.characters[0] ?? {})).toBe(false);
    expect("weaponQualityId" in (imported.characters[0] ?? {})).toBe(false);
    expect(imported.weaponInventory).toEqual([]);
    expect(imported.matrixTeams).toEqual([
      {
        id: "team-1",
        slots: [null, null, null],
      },
    ]);
    expect(imported.preferences).toBeNull();
  });

  test("round trips exported v5 documents through import", async () => {
    const preferences = {
      welcomeSeen: true,
      dashboardSortKey: "updated" as const,
      dashboardViewMode: "grid" as const,
      backupNoticeAcknowledgedAt: 67890,
    };

    exportTrackerData(
      [makeCharacter()],
      makeWeaponInventory(),
      makeMatrixTeams(),
      preferences,
      7,
    );

    expect(exportedBlob).toBeInstanceOf(Blob);
    expect(clickedDownloadName).toMatch(
      /^wuwa-tracker-\d{4}-\d{2}-\d{2}\.json$/,
    );

    if (!exportedBlob) {
      throw new Error("Expected export blob.");
    }

    const imported = parseImportedTrackerData(await exportedBlob.text());

    expect(imported.characters[0]?.id).toBe("char-1");
    expect("characterIcon" in (imported.characters[0] ?? {})).toBe(false);
    expect("weaponQualityId" in (imported.characters[0] ?? {})).toBe(false);
    expect(imported.weaponInventory).toEqual(makeWeaponInventory());
    expect(imported.matrixTeams).toEqual(makeMatrixTeams());
    expect(imported.preferences).toEqual(preferences);
  });

  test("normalizes legacy v5 target checks into Other substat slots", () => {
    const legacyDocument = createTrackerDocumentV5({
      characters: [makeCharacter({ echoChecker: makeEchoChecker() })],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
    });
    const rawCharacter = makeCharacter({ echoChecker: makeEchoChecker() });
    const rawLegacyDocument = {
      ...legacyDocument,
      data: {
        ...legacyDocument.data,
        characters: [rawCharacter],
      },
    };

    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify(rawLegacyDocument),
    );

    const result = readStoredTrackerDocument();

    expect(
      result.document?.data.characters[0]?.echoChecker?.echoes.fourCost
        .substatIds,
    ).toEqual(["other", "other", null]);
  });

  test("preserves five priority-only substat slots in v5 documents", () => {
    const echoChecker = makeEchoChecker();

    echoChecker.echoes.fourCost.prioritySubstatIds = [
      "energy-regen",
      "crit-rate",
      "crit-dmg",
      "atk-percent",
      null,
    ];
    const document = createTrackerDocumentV5({
      characters: [makeCharacter({ noCrit: true, echoChecker })],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
    });

    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify(document),
    );

    expect(
      readStoredTrackerDocument().document?.data.characters[0]?.echoChecker
        ?.echoes.fourCost.prioritySubstatIds,
    ).toEqual([
      "energy-regen",
      "crit-rate",
      "crit-dmg",
      "atk-percent",
      null,
    ]);
  });

  test("recovers a corrupt current document from the last-known-good document", () => {
    const lastKnownGood = createTrackerDocumentV5({
      characters: [makeCharacter()],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
      savedAt: "2026-01-03T00:00:00.000Z",
    });

    localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, "{corrupt");
    localStorage.setItem(
      TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
      JSON.stringify(lastKnownGood),
    );

    const result = readStoredTrackerDocument();
    const rewrittenCurrent = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY) ?? "null",
    );

    expect(result.status.state).toBe("recovered");
    expect(result.document?.data.characters[0]?.id).toBe("char-1");
    expect(rewrittenCurrent.data.characters[0].id).toBe("char-1");
  });

  test("does not overwrite storage when current and backup documents are corrupt", () => {
    localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, "{current-corrupt");
    localStorage.setItem(
      TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
      "{backup-corrupt",
    );

    const result = inspectTrackerStorage();

    expect(result.state).toBe("error");
    expect(localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBe(
      "{current-corrupt",
    );
    expect(
      localStorage.getItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY),
    ).toBe("{backup-corrupt");
  });

  test("guarded document writes save when storage has the expected revision", () => {
    const currentDocument = createTrackerDocumentV5({
      characters: [makeCharacter()],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
      revision: 2,
      savedAt: "2026-01-03T00:00:00.000Z",
    });
    const nextDocument = createTrackerDocumentV5({
      ...currentDocument.data,
      characters: [
        makeCharacter({
          notes: "updated",
          updatedAt: "2026-01-04T00:00:00.000Z",
        }),
      ],
      revision: 3,
      savedAt: "2026-01-04T00:00:00.000Z",
    });

    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify(currentDocument),
    );

    const result = writeStoredTrackerDocumentWithRevisionGuard(nextDocument, 2);
    const storedDocument = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY) ?? "null",
    );
    const lastKnownGood = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY) ??
        "null",
    );

    expect(result.state).toBe("written");
    expect(storedDocument.revision).toBe(3);
    expect(storedDocument.data.characters[0].notes).toBe("updated");
    expect(lastKnownGood.revision).toBe(2);
  });

  test("guarded document writes refuse to overwrite newer storage revisions", () => {
    const previousLastKnownGood = createTrackerDocumentV5({
      characters: [makeCharacter({ notes: "backup" })],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
      revision: 3,
      savedAt: "2026-01-03T00:00:00.000Z",
    });
    const newerDocument = createTrackerDocumentV5({
      characters: [makeCharacter({ notes: "newer tab" })],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
      revision: 5,
      savedAt: "2026-01-05T00:00:00.000Z",
    });
    const staleNextDocument = createTrackerDocumentV5({
      characters: [makeCharacter({ notes: "stale tab" })],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
      revision: 4,
      savedAt: "2026-01-04T00:00:00.000Z",
    });

    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify(newerDocument),
    );
    localStorage.setItem(
      TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
      JSON.stringify(previousLastKnownGood),
    );

    const result = writeStoredTrackerDocumentWithRevisionGuard(
      staleNextDocument,
      3,
    );
    const storedDocument = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY) ?? "null",
    );
    const lastKnownGood = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY) ??
        "null",
    );

    expect(result.state).toBe("stale");
    expect(storedDocument.revision).toBe(5);
    expect(storedDocument.data.characters[0].notes).toBe("newer tab");
    expect(lastKnownGood.revision).toBe(3);
    expect(lastKnownGood.data.characters[0].notes).toBe("backup");
  });

  test("detects newer document revisions", () => {
    const document = createTrackerDocumentV5({
      characters: [makeCharacter()],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
      revision: 4,
    });

    expect(hasNewerTrackerDocumentRevision(document, 3)).toBe(true);
    expect(hasNewerTrackerDocumentRevision(document, 4)).toBe(false);
  });

  test("does not let stale migration plans overwrite newer v5 documents", () => {
    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 4,
        app: "wuwa-tracker",
        savedAt: "2026-01-04T00:00:00.000Z",
        revision: 4,
        data: {
          characters: [makeLegacyFlatCharacter()],
          weaponInventory: makeWeaponInventory(),
          matrixTeams: makeMatrixTeams(),
          preferences: DEFAULT_TRACKER_PREFERENCES,
        },
      }),
    );

    const inspection = inspectTrackerStorage();

    if (inspection.state !== "migration-required") {
      throw new Error("Expected v4 migration plan.");
    }

    const newerDocument = createTrackerDocumentV5({
      characters: [makeCharacter({ notes: "newer tab" })],
      weaponInventory: makeWeaponInventory(),
      matrixTeams: makeMatrixTeams(),
      preferences: DEFAULT_TRACKER_PREFERENCES,
      revision: 5,
      savedAt: "2026-01-05T00:00:00.000Z",
    });

    localStorage.setItem(
      TRACKER_DOCUMENT_STORAGE_KEY,
      JSON.stringify(newerDocument),
    );

    expect(() => commitStorageMigration(inspection.migrationPlan)).toThrow(
      TrackerStorageRevisionConflictError,
    );

    const storedDocument = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY) ?? "null",
    );

    expect(storedDocument.revision).toBe(5);
    expect(storedDocument.data.characters[0].notes).toBe("newer tab");
  });

  test("cleans deleted characters out of Matrix teams", () => {
    const cleanedTeams = cleanMatrixTeamsForCharacters(
      [
        {
          id: "team-1",
          slots: ["char-1", "deleted-char", "char-2"],
        },
        {
          id: "team-2",
          slots: ["deleted-char", null, "char-1"],
        },
      ],
      [
        makeCharacter({ id: "char-1" }),
        makeCharacter({ id: "char-2", characterId: 102, characterName: "Verina" }),
      ],
    );

    expect(cleanedTeams).toEqual([
      {
        id: "team-1",
        slots: ["char-1", null, "char-2"],
      },
      {
        id: "team-2",
        slots: [null, null, "char-1"],
      },
    ]);
  });

  test("uses preference defaults for missing or invalid values", () => {
    expect(normalizePreferences({})).toEqual(DEFAULT_TRACKER_PREFERENCES);
    expect(
      normalizePreferences({
        welcomeSeen: true,
        dashboardSortKey: "not-a-sort",
        dashboardViewMode: "grid",
        backupNoticeAcknowledgedAt: -1,
      }),
    ).toEqual({
        ...DEFAULT_TRACKER_PREFERENCES,
        welcomeSeen: true,
        dashboardViewMode: "grid",
      });
  });
});
