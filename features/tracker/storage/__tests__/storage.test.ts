import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createTrackerDocument,
  DEFAULT_TRACKER_PREFERENCES,
  exportTrackerData,
  parseImportedTrackerData,
  parseTrackerDocument,
  readStoredTrackerDocument,
  writeStoredTrackerDocument,
  writeStoredTrackerDocumentWithRevisionGuard,
  type TrackerDocument,
} from "../index";
import {
  getVersionBackupKey,
  LEGACY_TRACKER_DOCUMENT_STORAGE_KEY,
  TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
  TRACKER_DOCUMENT_STORAGE_KEY,
} from "../keys";
import { convertLegacyV5Document } from "../imports";
import { saveTrackerUpgrade } from "../upgrades";
import { createDefaultEchoChecker } from "../../domain/echo-rating";
import type { TrackedCharacter } from "../../types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  /** Returns the number of saved keys. */
  get length() {
    return this.values.size;
  }

  /** Removes all saved test values. */
  clear() {
    this.values.clear();
  }

  /**
   * Reads a stored test value.
   * @param key - The storage key.
   * @returns The value, or null when missing.
   */
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  /**
   * Reads a key by insertion index.
   * @param index - The key index.
   * @returns The key, or null when missing.
   */
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  /**
   * Removes a stored test value.
   * @param key - The storage key.
   */
  removeItem(key: string) {
    this.values.delete(key);
  }

  /**
   * Stores a test value.
   * @param key - The storage key.
   * @param value - The string value.
   */
  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

const storage = new MemoryStorage();
const legacyBackupKey = "wuwa-tracker.document.v4.lastKnownGood";

/** Creates a complete character with selections in both echo modes. */
function makeCharacter(): TrackedCharacter {
  const echoChecker = createDefaultEchoChecker(["DPS"]);
  echoChecker.echoes.fourCost.critRate = 10.5;
  echoChecker.echoes.fourCost.critDmg = 21;
  echoChecker.echoes.fourCost.substatIds = ["atk-percent", "heavy", null, null, null];
  echoChecker.echoes.fourCost.prioritySubstatIds = ["crit-rate", "crit-dmg", "energy-regen", null, null];

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
    checklist: { skills: true, fourCost: false, threeCostA: true, threeCostB: false, oneCostA: true, oneCostB: false },
    echoChecker,
    expectedEr: 120,
    actualEr: 118,
    notes: "main team",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

/** Creates a valid unified save with cross-referenced team data. */
function makeDocument(revision = 2) {
  return createTrackerDocument({
    characters: [makeCharacter()],
    weaponInventory: [{ weaponId: 201, count: 2 }],
    matrixTeams: [{ id: "team-1", slots: ["char-1", null, null] }],
    preferences: { ...DEFAULT_TRACKER_PREFERENCES, welcomeSeen: true, dashboardViewMode: "grid" },
    revision,
    savedAt: "2026-01-03T00:00:00.000Z",
  });
}

/** Creates a historical v5 document, including the now-unused custom fields. */
function makeLegacyDocument() {
  const document = makeDocument();

  return {
    app: "wuwa-tracker",
    schemaVersion: 5,
    revision: document.revision,
    savedAt: document.savedAt,
    data: {
      ...document.data,
      characters: document.data.characters.map((character) => ({
        ...character,
        substatPriority: "Crit Rate > Crit DMG",
        echoChecker: {
          ...character.echoChecker!,
          substatPriority: "historical priority",
          substats: [{ id: "custom", label: "custom target", checked: true }],
        },
      })),
    },
  };
}

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("unified schema", () => {
  test("accepts the exact canonical document without rewriting it", () => {
    const document = makeDocument();
    expect(parseTrackerDocument(document)).toEqual(document);
  });

  const invalidChanges: [string, (document: TrackerDocument) => void][] = [
    ["unknown envelope field", (document) => Reflect.set(document, "extra", true)],
    ["unknown data field", (document) => Reflect.set(document.data, "extra", true)],
    ["unknown character field", (document) => Reflect.set(document.data.characters[0], "substatPriority", "old")],
    ["unknown checklist field", (document) => Reflect.set(document.data.characters[0].checklist, "extra", true)],
    ["unknown checker field", (document) => Reflect.set(document.data.characters[0].echoChecker!, "substats", [])],
    ["unknown echo field", (document) => Reflect.set(document.data.characters[0].echoChecker!.echoes.fourCost, "hasRelevantStat", true)],
    ["unknown echo position", (document) => Reflect.set(document.data.characters[0].echoChecker!.echoes, "extra", {})],
    ["unknown preferences field", (document) => Reflect.set(document.data.preferences, "extra", true)],
    ["unknown inventory field", (document) => Reflect.set(document.data.weaponInventory[0], "extra", true)],
    ["unknown team field", (document) => Reflect.set(document.data.matrixTeams[0], "extra", true)],
    ["missing required field", (document) => Reflect.deleteProperty(document.data.characters[0], "noCrit")],
    ["invalid role", (document) => Reflect.set(document.data.characters[0], "roles", ["Unknown"])],
    ["invalid plan", (document) => Reflect.set(document.data.characters[0].echoChecker!, "plan", "Unknown")],
    ["invalid numeric type", (document) => Reflect.set(document.data.characters[0], "critRate", "70")],
    ["nonfinite number", (document) => document.data.characters[0].critRate = Infinity],
    ["invalid timestamp", (document) => document.savedAt = "yesterday"],
    ["fractional catalog ID", (document) => document.data.characters[0].characterId = 1.5],
    ["fractional inventory count", (document) => document.data.weaponInventory[0].count = 1.5],
    ["zero inventory count", (document) => document.data.weaponInventory[0].count = 0],
    ["incorrect team length", (document) => document.data.matrixTeams[0].slots.push(null)],
    ["incorrect substat length", (document) => document.data.characters[0].echoChecker!.echoes.fourCost.substatIds.pop()],
    ["invalid substat", (document) => Reflect.set(document.data.characters[0].echoChecker!.echoes.fourCost.substatIds, 0, "other")],
    ["duplicate substats", (document) => document.data.characters[0].echoChecker!.echoes.fourCost.substatIds[1] = "atk-percent"],
    ["duplicate roles", (document) => document.data.characters[0].roles.push("DPS")],
    ["duplicate character IDs", (document) => document.data.characters.push(makeCharacter())],
    ["duplicate inventory IDs", (document) => document.data.weaponInventory.push({ weaponId: 201, count: 1 })],
    ["duplicate team IDs", (document) => document.data.matrixTeams.push({ ...document.data.matrixTeams[0] })],
    ["dangling team reference", (document) => document.data.matrixTeams[0].slots[0] = "missing"],
    ["wrong format", (document) => Reflect.set(document, "format", "legacy")],
    ["unknown version", (document) => Reflect.set(document, "schemaVersion", 99)],
  ];

  test.each(invalidChanges)("rejects %s without modifying input", (_, change) => {
    const document = makeDocument();
    change(document);
    const original = structuredClone(document);
    expect(parseTrackerDocument(document)).toBeNull();
    expect(document).toEqual(original);
  });
});

describe("legacy bridge", () => {
  test("preserves build data and removes only obsolete fields", () => {
    const legacy = makeLegacyDocument();
    const original = structuredClone(legacy);
    expect(convertLegacyV5Document(legacy)).toEqual(makeDocument());
    expect(legacy).toEqual(original);
  });

  test("copies legacy v5 once without writing or deleting any legacy key", () => {
    const legacyRaw = JSON.stringify(makeLegacyDocument());
    storage.setItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY, legacyRaw);
    storage.setItem(legacyBackupKey, "legacy backup bytes");
    const writes = vi.spyOn(storage, "setItem");
    const deletes = vi.spyOn(storage, "removeItem");

    expect(readStoredTrackerDocument().document).toEqual(makeDocument());
    expect(writes.mock.calls.map(([key]) => key)).toEqual([TRACKER_DOCUMENT_STORAGE_KEY]);
    expect(deletes).not.toHaveBeenCalled();
    expect(storage.getItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY)).toBe(legacyRaw);
    expect(storage.getItem(legacyBackupKey)).toBe("legacy backup bytes");

    writes.mockClear();
    expect(readStoredTrackerDocument().document).toEqual(makeDocument());
    expect(writes).not.toHaveBeenCalled();
  });

  test("prefers unified saves over stale legacy data", () => {
    storage.setItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(makeLegacyDocument()));
    const current = makeDocument(10);
    current.data.characters[0].notes = "new unified edit";
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(current));
    expect(readStoredTrackerDocument().document).toEqual(current);
  });

  test.each(["{invalid", JSON.stringify({ ...makeLegacyDocument(), schemaVersion: 4 })])(
    "preserves unsupported or damaged legacy data",
    (raw) => {
      storage.setItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY, raw);
      expect(readStoredTrackerDocument().status.state).toBe("error");
      expect(storage.getItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY)).toBe(raw);
      expect(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBeNull();
    },
  );

  test("preserves legacy data if the unified write fails", () => {
    const raw = JSON.stringify(makeLegacyDocument());
    storage.setItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY, raw);
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(readStoredTrackerDocument().status.state).toBe("error");
    expect(storage.getItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY)).toBe(raw);
    expect(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBeNull();
  });
});

describe("recovery and saves", () => {
  test("loads an empty installation without writing anything", () => {
    expect(readStoredTrackerDocument()).toMatchObject({ document: null, status: { state: "ready" } });
    expect(storage.length).toBe(0);
  });

  test.each([null, "", "{corrupt"])("recovers a missing or corrupt save (%s)", (raw) => {
    if (raw !== null) storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, raw);
    storage.setItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY, JSON.stringify(makeDocument()));
    expect(readStoredTrackerDocument()).toMatchObject({ document: makeDocument(), status: { state: "recovered" } });
    expect(JSON.parse(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)!)).toEqual(makeDocument());
  });

  test("does not fall back to legacy data when unified data is damaged", () => {
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, "{corrupt");
    storage.setItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY, "{corrupt backup");
    storage.setItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(makeLegacyDocument()));
    const writes = vi.spyOn(storage, "setItem");
    expect(readStoredTrackerDocument().status.state).toBe("error");
    expect(writes).not.toHaveBeenCalled();
  });

  test("does not restore an older backup over a newer unsupported unified version", () => {
    const raw = JSON.stringify({ ...makeDocument(), schemaVersion: 99 });
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, raw);
    storage.setItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY, JSON.stringify(makeDocument()));
    expect(readStoredTrackerDocument().status.state).toBe("error");
    expect(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBe(raw);
  });

  test("reports failed recovery writes and leaves both documents untouched", () => {
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, "{corrupt");
    const backup = JSON.stringify(makeDocument());
    storage.setItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY, backup);
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(readStoredTrackerDocument().status.state).toBe("error");
    expect(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBe("{corrupt");
    expect(storage.getItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY)).toBe(backup);
  });

  test("backs up the previous valid document during an ordinary save", () => {
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(makeDocument(2)));
    expect(writeStoredTrackerDocumentWithRevisionGuard(makeDocument(3), 2).state).toBe("written");
    expect(JSON.parse(storage.getItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY)!)).toEqual(makeDocument(2));
    expect(JSON.parse(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)!)).toEqual(makeDocument(3));
  });

  test("rejects stale writes before touching either save", () => {
    const raw = JSON.stringify(makeDocument(5));
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, raw);
    const writes = vi.spyOn(storage, "setItem");
    expect(writeStoredTrackerDocumentWithRevisionGuard(makeDocument(4), 3).state).toBe("stale");
    expect(writes).not.toHaveBeenCalled();
  });

  test("rejects invalid new documents before backing up or writing", () => {
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(makeDocument()));
    const invalid = makeDocument(3);
    Reflect.set(invalid.data.characters[0], "extra", true);
    const writes = vi.spyOn(storage, "setItem");
    expect(() => writeStoredTrackerDocument(invalid)).toThrow();
    expect(writes).not.toHaveBeenCalled();
  });

  test.each(["{corrupt", JSON.stringify({ ...makeDocument(), schemaVersion: 99 })])(
    "refuses edits over an unreadable or unsupported active save",
    (raw) => {
      storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, raw);
      const writes = vi.spyOn(storage, "setItem");

      expect(() => writeStoredTrackerDocumentWithRevisionGuard(makeDocument(3), 2)).toThrow();
      expect(writes).not.toHaveBeenCalled();
      expect(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBe(raw);
    },
  );

  test("leaves the active save unchanged when its rolling backup cannot be written", () => {
    const raw = JSON.stringify(makeDocument());
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, raw);
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(() => writeStoredTrackerDocument(makeDocument(3))).toThrow();
    expect(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBe(raw);
  });

  test("keeps a frozen version snapshot independently of ordinary save backups", () => {
    const raw = JSON.stringify(makeDocument());
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, raw);
    saveTrackerUpgrade(makeDocument(3), { schemaVersion: 1, raw });
    saveTrackerUpgrade(makeDocument(4), { schemaVersion: 1, raw: "retry must not replace original" });
    writeStoredTrackerDocument(makeDocument(5));
    expect(storage.getItem(getVersionBackupKey(1))).toBe(raw);
    expect(JSON.parse(storage.getItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY)!)).toEqual(makeDocument(4));
  });

  test("does not replace the active save if its version snapshot fails", () => {
    const raw = JSON.stringify(makeDocument());
    storage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, raw);
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(() => saveTrackerUpgrade(makeDocument(3), { schemaVersion: 1, raw })).toThrow();
    expect(storage.getItem(TRACKER_DOCUMENT_STORAGE_KEY)).toBe(raw);
  });
});

describe("JSON imports and exports", () => {
  test("imports unified and legacy v5 exports into identical build data", () => {
    expect(parseImportedTrackerData(JSON.stringify(makeDocument()))).toEqual(makeDocument().data);
    expect(parseImportedTrackerData(JSON.stringify(makeLegacyDocument()))).toEqual(makeDocument().data);
  });

  test("imports historical array and object exports", () => {
    const legacy = makeLegacyDocument();
    const array = parseImportedTrackerData(JSON.stringify(legacy.data.characters));
    expect(array.characters).toEqual(makeDocument().data.characters);
    expect(array.preferences).toBeNull();
    expect(array.weaponInventory).toEqual([]);
    expect(parseImportedTrackerData(JSON.stringify(legacy.data))).toEqual(makeDocument().data);
  });

  test("imports v4 exports without preserving cached catalog fields", () => {
    const legacy = makeLegacyDocument();
    const characters = legacy.data.characters.map((character) => ({
      ...character,
      characterIcon: "/rover.png", qualityId: 5, elementName: "Spectro",
      weaponTypeId: 1, weaponTypeName: "Sword", weaponQualityId: 5,
      echoChecker: undefined,
    }));
    const imported = parseImportedTrackerData(JSON.stringify({ ...legacy, schemaVersion: 4, data: { ...legacy.data, characters } }));
    expect(imported.characters[0].characterName).toBe("Rover");
    expect(imported.characters[0]).not.toHaveProperty("characterIcon");
  });

  test("converts historical slots and flags without inventing substat identities", () => {
    const legacy = makeLegacyDocument();
    const echo = legacy.data.characters[0].echoChecker.echoes.fourCost;
    Reflect.set(echo, "substatIds", ["other", "atk", null]);
    Reflect.deleteProperty(echo, "prioritySubstatIds");
    Reflect.set(echo, "hasRelevantStat", true);
    const imported = parseImportedTrackerData(JSON.stringify(legacy));
    expect(imported.characters[0].echoChecker!.echoes.fourCost).toEqual({
      critRate: 10.5, critDmg: 21,
      substatIds: [null, "atk", null, null, null],
      prioritySubstatIds: [null, null, null, null, null],
    });
  });

  test.each([
    "{broken",
    JSON.stringify({ ...makeDocument(), schemaVersion: 99 }),
    JSON.stringify({ ...makeLegacyDocument(), schemaVersion: 99 }),
    JSON.stringify([{ id: "broken character" }]),
  ])("rejects invalid imports without accepting them as a different format", (text) => {
    expect(() => parseImportedTrackerData(text)).toThrow();
  });

  test("exports a complete unified document and imports it without data loss", async () => {
    let exported: Blob | undefined;
    const link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", { createElement: () => link });
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      exported = blob as Blob;
      return "blob:export";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { data } = makeDocument();
    exportTrackerData(data.characters, data.weaponInventory, data.matrixTeams, data.preferences);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.download).toMatch(/^wuwa-tracker-\d{4}-\d{2}-\d{2}\.json$/);
    expect(exported).toBeInstanceOf(Blob);
    const text = await exported!.text();
    expect(JSON.parse(text)).toMatchObject({ format: "unified", schemaVersion: 1 });
    expect(parseImportedTrackerData(text)).toEqual(data);
  });
});
