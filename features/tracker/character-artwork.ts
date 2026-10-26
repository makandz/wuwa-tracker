import { z } from "zod";

import { CHARACTER_API } from "./constants";

const artworkSchema = z.object({
  RolePortrait: z.string().catch(""),
  FormationRoleCard: z.string().catch(""),
});
const artworkRequests = new Map<number, Promise<string | null>>();

/**
 * Reads formation artwork, falling back to the full portrait when necessary.
 * @param detail - The unknown character detail response.
 * @returns An image URL supported by the app, or null without usable artwork.
 */
export function getCharacterArtworkUrl(detail: unknown): string | null {
  const parsed = artworkSchema.safeParse(detail);

  if (!parsed.success) {
    return null;
  }

  for (const source of [parsed.data.FormationRoleCard, parsed.data.RolePortrait]) {
    const normalized = source.startsWith("/Game/")
      ? `https://api.encore.moe/resource/Data${source}`
      : source;

    try {
      const url = new URL(normalized);

      if (url.origin === "https://api.encore.moe" && url.pathname.startsWith("/resource/")) {
        return url.href;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/** Fetches and validates only the artwork fields from a character's details. */
async function fetchCharacterArtwork(characterId: number): Promise<string | null> {
  const response = await fetch(`${CHARACTER_API}/${characterId}`);

  if (!response.ok) {
    throw new Error("Character artwork request failed.");
  }

  return getCharacterArtworkUrl(await response.json());
}

/**
 * Reuses in-flight and completed artwork requests for the current app session.
 * @param characterId - The catalog character ID.
 * @returns Its artwork URL, or null when unavailable; failed requests can be retried.
 */
export function loadCharacterArtwork(characterId: number): Promise<string | null> {
  if (!Number.isInteger(characterId) || characterId <= 0) {
    return Promise.resolve(null);
  }

  const cached = artworkRequests.get(characterId);

  if (cached) {
    return cached;
  }

  const request = fetchCharacterArtwork(characterId).catch(() => {
    artworkRequests.delete(characterId);
    return null;
  });
  artworkRequests.set(characterId, request);

  return request;
}
