import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

import { TrackerProvider } from "../tracker-provider";
import { useCatalog } from "../use-catalog";
import { usePersistedTrackerState } from "../use-persisted-tracker-state";
import { usePathname, useRouter } from "next/navigation";

vi.mock("../use-catalog");
vi.mock("../use-persisted-tracker-state");
vi.mock("next/navigation", () => ({ usePathname: vi.fn(), useRouter: vi.fn() }));

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(),
  });
  vi.mocked(useCatalog).mockReturnValue({ characters: [], weapons: [], loading: false, error: "" });
  vi.mocked(usePersistedTrackerState).mockReturnValue({
    characters: [],
    weaponInventory: [],
    matrixTeams: [],
    welcomeSeen: false,
    backupNoticeAcknowledgedAt: 0,
    storageLoaded: true,
    storageVersion: null,
    storageStatus: { state: "error", message: "Unreadable save" },
    createCharacter: vi.fn(),
    updateCharacter: vi.fn(),
    deleteCharacter: vi.fn(),
    setWeaponCount: vi.fn(),
    replaceAllData: vi.fn(),
    clearTrackerData: vi.fn(),
    updateMatrixTeams: vi.fn(),
    updatePreferences: vi.fn(),
    reloadStoredTrackerData: vi.fn(),
  });
});

test("offers settings and retry actions after a startup load failure", () => {
  const html = renderToStaticMarkup(createElement(TrackerProvider, null, "Tracker editor"));

  expect(html).toContain("Unreadable save");
  expect(html).toContain("Retry Loading");
  expect(html).toContain("Open Settings");
  expect(html).not.toContain("Tracker editor");
});

test("keeps recovery settings accessible when no document could be loaded", () => {
  vi.mocked(usePathname).mockReturnValue("/settings");
  const html = renderToStaticMarkup(createElement(TrackerProvider, null, "Import and reset settings"));

  expect(html).toContain("Import and reset settings");
  expect(html).not.toContain("Retry Loading");
});

test("still blocks stale tabs from editing through settings", () => {
  vi.mocked(usePathname).mockReturnValue("/settings");
  const state = vi.mocked(usePersistedTrackerState).getMockImplementation()!();
  vi.mocked(usePersistedTrackerState).mockReturnValue({ ...state, storageStatus: { state: "stale", message: "Changed in another tab" } });
  const html = renderToStaticMarkup(createElement(TrackerProvider, null, "Import and reset settings"));

  expect(html).toContain("Reload Data");
  expect(html).not.toContain("Import and reset settings");
});
