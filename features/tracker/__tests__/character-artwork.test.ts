import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { getCharacterArtworkUrl } from "../character-artwork";

const portrait = "https://api.encore.moe/resource/portrait.webp";
const formation = "https://api.encore.moe/resource/formation.webp";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("prefers formation artwork and ignores unrelated character detail fields", () => {
  expect(getCharacterArtworkUrl({ RolePortrait: portrait, FormationRoleCard: formation, Name: { Content: "Hsin" } })).toBe(formation);
});

test("falls back to the full portrait and normalizes game asset paths", () => {
  expect(getCharacterArtworkUrl({ FormationRoleCard: "", RolePortrait: portrait })).toBe(portrait);
  expect(getCharacterArtworkUrl({ FormationRoleCard: "/Game/Aki/formation.webp" })).toBe("https://api.encore.moe/resource/Data/Game/Aki/formation.webp");
  expect(getCharacterArtworkUrl({ FormationRoleCard: 123, RolePortrait: portrait })).toBe(portrait);
});

test("rejects missing artwork, malformed responses, and unsupported image hosts", () => {
  expect(getCharacterArtworkUrl(null)).toBeNull();
  expect(getCharacterArtworkUrl([])).toBeNull();
  expect(getCharacterArtworkUrl({})).toBeNull();
  expect(getCharacterArtworkUrl({ RolePortrait: "javascript:alert(1)" })).toBeNull();
  expect(getCharacterArtworkUrl({ RolePortrait: "https://example.com/portrait.webp" })).toBeNull();
  expect(getCharacterArtworkUrl({ RolePortrait: "https://api.encore.moe/not-an-asset" })).toBeNull();
  expect(getCharacterArtworkUrl({ RolePortrait: "https://example.com/portrait.webp", FormationRoleCard: formation })).toBe(formation);
  expect(getCharacterArtworkUrl({ FormationRoleCard: "https://example.com/formation.webp", RolePortrait: portrait })).toBe(portrait);
});

test("shares concurrent requests and reuses completed artwork for a character", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ RolePortrait: portrait })));
  vi.stubGlobal("fetch", fetchMock);
  const { loadCharacterArtwork } = await import("../character-artwork");
  const first = loadCharacterArtwork(1311);
  const second = loadCharacterArtwork(1311);

  expect(first).toBe(second);
  expect(await first).toBe(portrait);
  expect(await loadCharacterArtwork(1311)).toBe(portrait);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("https://api-v2.encore.moe/api/en/character/1311");
});

test("allows retry after an unsuccessful artwork response", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ RolePortrait: portrait })));
  vi.stubGlobal("fetch", fetchMock);
  const { loadCharacterArtwork } = await import("../character-artwork");

  expect(await loadCharacterArtwork(1311)).toBeNull();
  expect(await loadCharacterArtwork(1311)).toBe(portrait);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("handles unavailable artwork and invalid character IDs without repeated requests", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  const { loadCharacterArtwork } = await import("../character-artwork");

  expect(await loadCharacterArtwork(0)).toBeNull();
  expect(await loadCharacterArtwork(-1)).toBeNull();
  expect(await loadCharacterArtwork(1311)).toBeNull();
  expect(await loadCharacterArtwork(1311)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("handles network failures without leaving a rejected request in the cache", async () => {
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce(new Response(JSON.stringify({ FormationRoleCard: formation })));
  vi.stubGlobal("fetch", fetchMock);
  const { loadCharacterArtwork } = await import("../character-artwork");

  expect(await loadCharacterArtwork(1311)).toBeNull();
  expect(await loadCharacterArtwork(1311)).toBe(formation);
});
