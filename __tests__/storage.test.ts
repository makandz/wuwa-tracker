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
} from "../app/_tracker/storage/keys";
import {
  DEFAULT_TRACKER_PREFERENCES,
  createTrackerDocumentV4,
  exportTrackerData,
  parseImportedTrackerData,
} from "../app/_tracker/storage";
import { normalizePreferences } from "../app/_tracker/storage/documents";
import { commitStorageMigration } from "../app/_tracker/storage/migrations/plans";
import { inspectTrackerStorage } from "../app/_tracker/storage/inspection";
import { readStoredTrackerDocument } from "../app/_tracker/storage/recovery";
import { cleanMatrixTeamsForCharacters } from "../app/_tracker/use-persisted-tracker-state";
import type {
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../app/_tracker/types";

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
    characterIcon: "/rover.png",
    qualityId: 5,
    elementName: "Spectro",
    weaponTypeId: 1,
    weaponTypeName: "Sword",
    roles: ["DPS"],
    weaponId: 201,
    weaponName: "Emerald of Genesis",
    weaponQualityId: 5,
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
  test("migrates legacy split-key storage into the v4 document", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeCharacter()]));
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

    const document = commitStorageMigration(inspection.migrationPlan);
    const storedDocument = JSON.parse(
      localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY) ?? "null",
    );

    expect(document.schemaVersion).toBe(4);
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
  });

  test("imports old array exports as character-only data", () => {
    const imported = parseImportedTrackerData(JSON.stringify([makeCharacter()]));

    expect(imported.characters).toHaveLength(1);
    expect(imported.characters[0]?.characterName).toBe("Rover");
    expect(imported.weaponInventory).toEqual([]);
    expect(imported.matrixTeams).toEqual([
      {
        id: "team-1",
        slots: [null, null, null],
      },
    ]);
    expect(imported.preferences).toBeNull();
  });

  test("round trips exported v4 documents through import", async () => {
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
    expect(imported.weaponInventory).toEqual(makeWeaponInventory());
    expect(imported.matrixTeams).toEqual(makeMatrixTeams());
    expect(imported.preferences).toEqual(preferences);
  });

  test("recovers a corrupt current document from the last-known-good document", () => {
    const lastKnownGood = createTrackerDocumentV4({
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
